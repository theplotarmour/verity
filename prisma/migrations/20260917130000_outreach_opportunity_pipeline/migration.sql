-- ---------------------------------------------------------------------------
-- Task 106 Phase D: OutreachOpportunity / OutreachProposal /
-- OutreachClosedClient — OPPORTUNITY distinct from CLOSED CLIENT (master
-- prompt §8-9). outreach_lead.state stays the single driver of pipeline
-- stage; these are materialized facts for reporting/audit, created only
-- from advanceLeadStage's existing transitions.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_opportunity" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "track" TEXT NOT NULL,
    "estimated_value_minor" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_opportunity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_opportunity_tenant_id_lead_id_key" ON "outreach_opportunity"("tenant_id", "lead_id");
CREATE INDEX "outreach_opportunity_tenant_id_team_id_idx" ON "outreach_opportunity"("tenant_id", "team_id");

ALTER TABLE "outreach_opportunity" ADD CONSTRAINT "outreach_opportunity_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_opportunity" ADD CONSTRAINT "outreach_opportunity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_opportunity" ADD CONSTRAINT "outreach_opportunity_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "outreach_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "outreach_proposal" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "value_minor" INTEGER,
    "notes" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_proposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_proposal_tenant_id_lead_id_sent_at_idx" ON "outreach_proposal"("tenant_id", "lead_id", "sent_at");

ALTER TABLE "outreach_proposal" ADD CONSTRAINT "outreach_proposal_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_proposal" ADD CONSTRAINT "outreach_proposal_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The only table that answers "is this client CLOSED" for compensation/
-- sales-reporting purposes (§8). One row per lead, written exactly once,
-- exactly when advanceLeadStage's existing threshold check already passes.
CREATE TABLE "outreach_closed_client" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "closer_id" UUID NOT NULL,
    "advance_received_minor" INTEGER NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_closed_client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_closed_client_tenant_id_lead_id_key" ON "outreach_closed_client"("tenant_id", "lead_id");

ALTER TABLE "outreach_closed_client" ADD CONSTRAINT "outreach_closed_client_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_closed_client" ADD CONSTRAINT "outreach_closed_client_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (INV-001) — opportunity/closed_client are append-once
-- (unique per lead enforces "once"); proposal is append-only (a revised
-- proposal is a new row, never an edit to the sent one).
-- ---------------------------------------------------------------------------

ALTER TABLE "outreach_opportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_opportunity" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_opportunity_read" ON "outreach_opportunity"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_opportunity_append" ON "outreach_opportunity"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_opportunity_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_opportunity"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

ALTER TABLE "outreach_proposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_proposal" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_proposal_read" ON "outreach_proposal"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_proposal_append" ON "outreach_proposal"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_proposal_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_proposal"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

ALTER TABLE "outreach_closed_client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_closed_client" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_closed_client_read" ON "outreach_closed_client"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_closed_client_append" ON "outreach_closed_client"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_closed_client_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_closed_client"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

-- ---------------------------------------------------------------------------
-- CAPABILITY REGISTRATION
-- ---------------------------------------------------------------------------

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.outreach.opportunity', 'verity.capability.outreach', 'Persistent', 'outreach_opportunity', true),
  ('verity.outreach.proposal', 'verity.capability.outreach', 'Persistent', 'outreach_proposal', true),
  ('verity.outreach.closed_client', 'verity.capability.outreach', 'Persistent', 'outreach_closed_client', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_cat(
  entity_types,
  ARRAY['verity.outreach.opportunity', 'verity.outreach.proposal', 'verity.outreach.closed_client']::text[]
)
WHERE id = 'verity.capability.outreach'
  AND NOT ('verity.outreach.opportunity' = ANY(entity_types));

DO $$ DECLARE t uuid; BEGIN
  FOR t IN SELECT DISTINCT tenant_id FROM public.role WHERE name IN ('Founders'' Office', 'Senior Outreach Officer', 'Junior Outreach Officer') LOOP
    PERFORM set_config('verity.tenant_id', t::text, true);
    INSERT INTO public.permission (id, tenant_id, role_id, verb, entity, scope)
    SELECT gen_random_uuid(), r.tenant_id, r.id, v.verb::"PermissionVerb", e.entity, 'Tenant'::"PermissionScope"
      FROM public.role r
      CROSS JOIN (VALUES ('verity.outreach.opportunity'), ('verity.outreach.proposal'), ('verity.outreach.closed_client')) e(entity)
      CROSS JOIN (VALUES ('Read'), ('Create')) v(verb)
      WHERE r.tenant_id = t AND r.name IN ('Founders'' Office', 'Senior Outreach Officer', 'Junior Outreach Officer')
    ON CONFLICT (role_id, verb, entity, scope) DO NOTHING;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- BACKFILL: every lead already past `opportunity`/`proposal`/`closed_won`
-- gets its materialized record retroactively, so historical data isn't
-- invisible to the new entities the day this ships.
-- ---------------------------------------------------------------------------

INSERT INTO "outreach_opportunity" (id, tenant_id, lead_id, team_id, track, created_at)
SELECT gen_random_uuid(), l.tenant_id, l.id, l.team_id, l.track, l.updated_at
FROM "outreach_lead" l
WHERE l.state IN ('opportunity','handoff','proposal','negotiation','verbal_yes','invoice_requested','advance_received','closed_won')
ON CONFLICT (tenant_id, lead_id) DO NOTHING;

INSERT INTO "outreach_proposal" (id, tenant_id, lead_id, sent_at)
SELECT gen_random_uuid(), l.tenant_id, l.id, l.updated_at
FROM "outreach_lead" l
WHERE l.state IN ('proposal','negotiation','verbal_yes','invoice_requested','advance_received','closed_won');

INSERT INTO "outreach_closed_client" (id, tenant_id, lead_id, closer_id, advance_received_minor, closed_at)
SELECT gen_random_uuid(), l.tenant_id, l.id, COALESCE(l.closer_id, l.opportunity_owner_id), l.advance_received_minor, COALESCE(l.closed_at, l.updated_at)
FROM "outreach_lead" l
WHERE l.state = 'closed_won'
ON CONFLICT (tenant_id, lead_id) DO NOTHING;
