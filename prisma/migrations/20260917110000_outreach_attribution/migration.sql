-- ---------------------------------------------------------------------------
-- Task 106 Phase B: OutreachAttributionRecord — APPEND-ONLY attribution
-- history (master prompt §60). Does not replace outreach_lead's own
-- lead_originator_id/opportunity_owner_id/closer_id columns; this is the
-- queryable trail alongside them.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_attribution_record" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "party_id" UUID NOT NULL,
    "changed_by_party_id" UUID NOT NULL,
    "reason" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_attribution_record_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_attribution_record_tenant_id_lead_id_effective_fr_idx" ON "outreach_attribution_record"("tenant_id", "lead_id", "effective_from");

ALTER TABLE "outreach_attribution_record" ADD CONSTRAINT "outreach_attribution_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_attribution_record" ADD CONSTRAINT "outreach_attribution_record_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outreach_attribution_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_attribution_record" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_attribution_record_read" ON "outreach_attribution_record"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_attribution_record_append" ON "outreach_attribution_record"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_attribution_record_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_attribution_record"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();
CREATE TRIGGER audit_command_mutation AFTER INSERT OR UPDATE OR DELETE ON "outreach_attribution_record"
  FOR EACH ROW EXECUTE FUNCTION verity.audit_command_mutation();

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.outreach.attribution_record', 'verity.capability.outreach', 'Persistent', 'outreach_attribution_record', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.attribution_record')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.attribution_record' = ANY(entity_types));

-- Read for every outreach role (Core needs the full trail; a Senior/Junior
-- reading their own lead's history is harmless and useful); Create is
-- granted too so entity-level checks stay consistent with every other
-- capability entity, even though every write happens inside commands that
-- already require Edit/Create on verity.outreach.lead.
DO $$ DECLARE t uuid; BEGIN
  FOR t IN SELECT DISTINCT tenant_id FROM public.role WHERE name IN ('Founders'' Office', 'Senior Outreach Officer', 'Junior Outreach Officer') LOOP
    PERFORM set_config('verity.tenant_id', t::text, true);
    INSERT INTO public.permission (id, tenant_id, role_id, verb, entity, scope)
    SELECT gen_random_uuid(), r.tenant_id, r.id, v.verb::"PermissionVerb", 'verity.outreach.attribution_record', 'Tenant'::"PermissionScope"
      FROM public.role r CROSS JOIN (VALUES ('Read'), ('Create')) v(verb)
      WHERE r.tenant_id = t AND r.name IN ('Founders'' Office', 'Senior Outreach Officer', 'Junior Outreach Officer')
    ON CONFLICT (role_id, verb, entity, scope) DO NOTHING;
  END LOOP;
END $$;
