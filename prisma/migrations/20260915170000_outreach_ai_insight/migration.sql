-- ---------------------------------------------------------------------------
-- Task 106 Phase 8: OutreachAiInsight — append-only AI suggestions with
-- provenance (master-context §85, §32-33). Never a fact about the lead.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_ai_insight" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "source_reads" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "requested_by_party_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_ai_insight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_ai_insight_tenant_id_lead_id_created_at_idx" ON "outreach_ai_insight"("tenant_id", "lead_id", "created_at");

ALTER TABLE "outreach_ai_insight" ADD CONSTRAINT "outreach_ai_insight_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_ai_insight" ADD CONSTRAINT "outreach_ai_insight_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outreach_ai_insight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_ai_insight" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_ai_insight_read" ON "outreach_ai_insight"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_ai_insight_append" ON "outreach_ai_insight"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_ai_insight_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_ai_insight"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();
-- Field-level audit, same as every other outreach table (see 20260915150000).
CREATE TRIGGER audit_command_mutation AFTER INSERT OR UPDATE OR DELETE ON "outreach_ai_insight"
  FOR EACH ROW EXECUTE FUNCTION verity.audit_command_mutation();

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.outreach.ai_insight', 'verity.capability.outreach', 'Persistent', 'outreach_ai_insight', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.ai_insight')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.ai_insight' = ANY(entity_types));

-- Every existing outreach role may request and read suggestions on the
-- leads it can already see (§85 "assist"); the underlying reads are still
-- gated per-role by the queries the turn executes. Written as data here,
-- not left to an ad-hoc script, so a fresh database and the shared one
-- agree. Idempotent per (role, verb, entity, scope).
DO $$ DECLARE t uuid; BEGIN
  FOR t IN SELECT DISTINCT tenant_id FROM public.role WHERE name IN ('Founders'' Office', 'Senior Outreach Officer', 'Junior Outreach Officer') LOOP
    PERFORM set_config('verity.tenant_id', t::text, true);
    INSERT INTO public.permission (id, tenant_id, role_id, verb, entity, scope)
    SELECT gen_random_uuid(), r.tenant_id, r.id, v.verb::"PermissionVerb", 'verity.outreach.ai_insight', 'Tenant'::"PermissionScope"
      FROM public.role r CROSS JOIN (VALUES ('Read'), ('Create')) v(verb)
      WHERE r.tenant_id = t AND r.name IN ('Founders'' Office', 'Senior Outreach Officer', 'Junior Outreach Officer')
    ON CONFLICT (role_id, verb, entity, scope) DO NOTHING;
  END LOOP;
END $$;
