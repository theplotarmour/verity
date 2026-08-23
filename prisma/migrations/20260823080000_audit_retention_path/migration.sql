-- ---------------------------------------------------------------------------
-- Audit retention path
--
-- The append-only triggers added in 20260823070000 blocked DELETE for every
-- role, which made two things impossible that the specification requires:
--
--   * EXE-AUD-002 retains the security stream "mapped to security compliance
--     requirements" — a retention window implies eventual deletion, so a stream
--     that can never be pruned cannot honour one.
--   * A tenant could no longer be removed at all, because the FK cascade from
--     `tenant` tried to delete audit rows and was refused.
--
-- The intent of EXE-AUD-003 is that a recorded fact cannot be altered or erased
-- by the application — not that no retention process may ever exist. So the lock
-- is now asymmetric:
--
--   UPDATE — refused for every role, without exception. The content of an audit
--            row is immutable; there is no legitimate reason to rewrite one.
--   DELETE — refused for the application role. Permitted only for a role holding
--            BYPASSRLS, which the runtime never uses (assertRlsEnforceable
--            refuses to start on such a connection) and which is reserved for
--            migrations and retention jobs.
--
-- The application therefore still cannot erase its own trail, which is the
-- property that matters.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.reject_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_privileged BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION '% is append-only: UPDATE is never permitted (EXE-AUD-003)',
      TG_TABLE_NAME USING ERRCODE = '42501';
  END IF;

  SELECT rolbypassrls OR rolsuper INTO v_privileged
  FROM pg_roles WHERE rolname = current_user;

  IF NOT COALESCE(v_privileged, FALSE) THEN
    RAISE EXCEPTION '% is append-only: DELETE is not permitted for the application role (EXE-AUD-003)',
      TG_TABLE_NAME USING ERRCODE = '42501';
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION verity.domain_event_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_privileged BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT rolbypassrls OR rolsuper INTO v_privileged
    FROM pg_roles WHERE rolname = current_user;
    IF NOT COALESCE(v_privileged, FALSE) THEN
      RAISE EXCEPTION 'domain_event is write-once: DELETE is not permitted for the application role (MET-EVE-001)'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  -- Only delivery marking may change; the fact itself is frozen.
  IF ROW(NEW.id, NEW.tenant_id, NEW.name, NEW.entity_key, NEW.entity_id,
         NEW.command_key, NEW.actor_user_id, NEW.payload, NEW.occurred_at)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.tenant_id, OLD.name, OLD.entity_key, OLD.entity_id,
         OLD.command_key, OLD.actor_user_id, OLD.payload, OLD.occurred_at) THEN
    RAISE EXCEPTION 'domain_event is write-once: only delivered_at may change (MET-EVE-001)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
