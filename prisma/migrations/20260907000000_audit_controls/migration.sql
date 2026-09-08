-- Commands stamp these transaction-local values before touching business rows.
-- Trigger writes share the mutation's transaction and disappear on rollback.
CREATE OR REPLACE FUNCTION verity.audit_command_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, verity AS $$
DECLARE
  command_key text := nullif(current_setting('verity.command_key', true), '');
  before_row jsonb := CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
  after_row jsonb := CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
  subject jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  field_name text;
  old_value text;
  new_value text;
  entity_key text;
BEGIN
  IF command_key IS NULL THEN RETURN NULL; END IF;
  IF (subject->>'tenant_id')::uuid IS DISTINCT FROM verity.current_tenant_id() THEN
    RAISE EXCEPTION 'audit tenant does not match command tenant';
  END IF;
  -- Keys are capability vocabulary, not a new platform entity enum.
  SELECT e.key INTO entity_key FROM public.entity_definition e
    WHERE e.table_name = TG_TABLE_NAME ORDER BY e.key LIMIT 1;
  entity_key := coalesce(entity_key, CASE
    WHEN TG_TABLE_NAME ~ '^(trading|plywood|billing|hr|accounting|inventory|scheduling)_'
      THEN 'verity.' || regexp_replace(TG_TABLE_NAME, '^([^_]+)_', '\1.')
    WHEN TG_TABLE_NAME IN ('asset', 'location', 'evidence')
      THEN 'verity.' || TG_TABLE_NAME || '.' || TG_TABLE_NAME
    ELSE regexp_replace(command_key, '\.[^.]+$', '') || '.' || TG_TABLE_NAME END);
  FOR field_name IN SELECT jsonb_object_keys(before_row || after_row) LOOP
    IF field_name IN ('id','tenant_id','created_at','updated_at','version') OR
       before_row->field_name IS NOT DISTINCT FROM after_row->field_name THEN CONTINUE; END IF;
    old_value := before_row->>field_name;
    new_value := after_row->>field_name;
    -- Unstructured JSON can contain arbitrarily nested secrets. Retain the
    -- fact of its change, not its values, until a schema declares safe fields.
    IF (TG_TABLE_NAME = 'config_parameter' AND field_name = 'value')
       OR field_name ~* '(password|passphrase|secret|token|credential|api_?key|private_?key|signing_?key|otp|^pin$|^salt$)'
       OR jsonb_typeof(before_row->field_name) IN ('object','array')
       OR jsonb_typeof(after_row->field_name) IN ('object','array') THEN
      IF old_value IS NOT NULL THEN old_value := '[redacted]'; END IF;
      IF new_value IS NOT NULL THEN new_value := '[redacted]'; END IF;
    END IF;
    INSERT INTO public.activity
      (id, tenant_id, entity_key, entity_id, actor_user_id, field_changed,
       old_value, new_value, command_key, correlation_id, source)
    VALUES (gen_random_uuid(), (subject->>'tenant_id')::uuid, entity_key,
      (subject->>'id')::uuid, nullif(current_setting('verity.actor_user_id', true),'')::uuid,
      field_name, old_value, new_value, command_key,
      nullif(current_setting('verity.correlation_id', true),'')::uuid,
      nullif(current_setting('verity.channel', true),''));
  END LOOP;
  RETURN NULL;
END;
$$;

-- Audit concrete tenant records, excluding append-only streams and generated
-- queues. New tables need this trigger in their migration as well.
DO $$ DECLARE table_name text; BEGIN
  FOR table_name IN
    SELECT t.table_name FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT IN ('activity','domain_event','security_audit_event',
        'notification','notification_delivery','offline_command','sync_exception',
        'metric_snapshot','integration_delivery','job_run')
      AND EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public'
        AND c.table_name=t.table_name AND c.column_name='tenant_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public'
        AND c.table_name=t.table_name AND c.column_name='id' AND c.udt_name='uuid')
  LOOP
    EXECUTE format('CREATE TRIGGER audit_command_mutation AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION verity.audit_command_mutation()', table_name);
  END LOOP;
END $$;

-- Existing tenant administrators receive explicit permissions for the streams
-- they administer. No Delete-on-arbitrary-entity or substring gate remains.
DO $$ DECLARE target_tenant_id uuid; BEGIN
  FOR target_tenant_id IN SELECT id FROM public.tenant LOOP
    PERFORM set_config('verity.tenant_id', target_tenant_id::text, true);
    INSERT INTO public.permission (id, tenant_id, role_id, verb, entity, scope)
    SELECT gen_random_uuid(), r.tenant_id, r.id, 'Read', e.entity, 'Tenant'
      FROM public.role r
      CROSS JOIN (VALUES ('verity.platform.activity'), ('verity.platform.security_event'),
        ('verity.platform.overview'), ('verity.platform.capability')) e(entity)
      WHERE r.tenant_id = target_tenant_id AND EXISTS (
        SELECT 1 FROM verity.resolve_permissions(r.id) p
        WHERE p.entity = 'verity.platform.role' AND p.verb = 'Edit' AND p.scope = 'Tenant')
    ON CONFLICT (role_id, verb, entity, scope) DO NOTHING;
  END LOOP;
END $$;

-- Migration bookkeeping is deployment metadata, not runtime application data.
REVOKE ALL ON public._prisma_migrations FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='verity_app') THEN
    REVOKE ALL ON public._prisma_migrations FROM verity_app;
  END IF;
END $$;
