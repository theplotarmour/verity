-- ---------------------------------------------------------------------------
-- Task 106 Phase C: OutreachEscalation — a first-class OPEN/IN REVIEW/
-- RESOLVED lifecycle object (master prompt §35). Additive: outreach_lead's
-- own escalated/escalation_* columns are kept and still written by the
-- capability's existing commands, so nothing already shipped breaks.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_escalation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "type" TEXT,
    "urgency" TEXT,
    "note" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "raised_by_party_id" UUID NOT NULL,
    "raised_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by_party_id" UUID,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "outreach_escalation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_escalation_tenant_id_lead_id_status_idx" ON "outreach_escalation"("tenant_id", "lead_id", "status");
CREATE INDEX "outreach_escalation_tenant_id_status_idx" ON "outreach_escalation"("tenant_id", "status");

ALTER TABLE "outreach_escalation" ADD CONSTRAINT "outreach_escalation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_escalation" ADD CONSTRAINT "outreach_escalation_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outreach_escalation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_escalation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_escalation_isolation" ON "outreach_escalation"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER audit_command_mutation AFTER INSERT OR UPDATE OR DELETE ON "outreach_escalation"
  FOR EACH ROW EXECUTE FUNCTION verity.audit_command_mutation();

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.outreach.escalation', 'verity.capability.outreach', 'Persistent', 'outreach_escalation', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.escalation')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.escalation' = ANY(entity_types));

-- Same grant shape as verity.outreach.lead itself: every existing role can
-- raise/read/act on escalations; resolving one is Edit, already implied by
-- the ActionExecute+Edit grants every role already holds on outreach entities.
DO $$ DECLARE t uuid; BEGIN
  FOR t IN SELECT DISTINCT tenant_id FROM public.role WHERE name IN ('Founders'' Office', 'Senior Outreach Officer', 'Junior Outreach Officer') LOOP
    PERFORM set_config('verity.tenant_id', t::text, true);
    INSERT INTO public.permission (id, tenant_id, role_id, verb, entity, scope)
    SELECT gen_random_uuid(), r.tenant_id, r.id, v.verb::"PermissionVerb", 'verity.outreach.escalation', 'Tenant'::"PermissionScope"
      FROM public.role r CROSS JOIN (VALUES ('Read'), ('Create'), ('Edit')) v(verb)
      WHERE r.tenant_id = t AND r.name IN ('Founders'' Office', 'Senior Outreach Officer', 'Junior Outreach Officer')
    ON CONFLICT (role_id, verb, entity, scope) DO NOTHING;
  END LOOP;
END $$;
