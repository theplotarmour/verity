-- ---------------------------------------------------------------------------
-- Task 106 Phase E: OutreachAssignment — "Healthcare -> Shreya + Mehak"
-- (master prompt §30). A Team Leader assigning a domain/domain-group/track/
-- geography slice of work to a member.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_assignment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "assigned_by_party_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_assignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_assignment_tenant_id_team_id_party_id_active_idx" ON "outreach_assignment"("tenant_id", "team_id", "party_id", "active");

ALTER TABLE "outreach_assignment" ADD CONSTRAINT "outreach_assignment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_assignment" ADD CONSTRAINT "outreach_assignment_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "outreach_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outreach_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_assignment" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_assignment_isolation" ON "outreach_assignment"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER audit_command_mutation AFTER INSERT OR UPDATE OR DELETE ON "outreach_assignment"
  FOR EACH ROW EXECUTE FUNCTION verity.audit_command_mutation();

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.outreach.assignment', 'verity.capability.outreach', 'Persistent', 'outreach_assignment', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.assignment')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.assignment' = ANY(entity_types));

-- Founders + Senior can assign (Team Leader ownership, master prompt §30);
-- Junior gets Read only — they see assignments in My Workspace, never make one.
DO $$ DECLARE t uuid; BEGIN
  FOR t IN SELECT DISTINCT tenant_id FROM public.role WHERE name IN ('Founders'' Office', 'Senior Outreach Officer') LOOP
    PERFORM set_config('verity.tenant_id', t::text, true);
    INSERT INTO public.permission (id, tenant_id, role_id, verb, entity, scope)
    SELECT gen_random_uuid(), r.tenant_id, r.id, v.verb::"PermissionVerb", 'verity.outreach.assignment', 'Tenant'::"PermissionScope"
      FROM public.role r CROSS JOIN (VALUES ('Read'), ('Create'), ('Edit')) v(verb)
      WHERE r.tenant_id = t AND r.name IN ('Founders'' Office', 'Senior Outreach Officer')
    ON CONFLICT (role_id, verb, entity, scope) DO NOTHING;
  END LOOP;

  FOR t IN SELECT DISTINCT tenant_id FROM public.role WHERE name = 'Junior Outreach Officer' LOOP
    PERFORM set_config('verity.tenant_id', t::text, true);
    INSERT INTO public.permission (id, tenant_id, role_id, verb, entity, scope)
    SELECT gen_random_uuid(), r.tenant_id, r.id, 'Read'::"PermissionVerb", 'verity.outreach.assignment', 'Tenant'::"PermissionScope"
      FROM public.role r
      WHERE r.tenant_id = t AND r.name = 'Junior Outreach Officer'
    ON CONFLICT (role_id, verb, entity, scope) DO NOTHING;
  END LOOP;
END $$;
