-- ---------------------------------------------------------------------------
-- CAPABILITY: OUTREACH — verity.capability.outreach (Task 105, P0 scope)
--
-- Hand-authored, same reasoning as every other capability migration in this
-- tree: `prisma migrate diff` bundles in unrelated pre-existing drift on the
-- live database, so this file is isolated to exactly this capability's DDL.
--
-- PlotArmour Studio's internal client-acquisition operating system. Runs on
-- its own new tenant (see prisma/seed-pa-oms.ts) — not layered onto any
-- existing client tenant.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_team" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "leader_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "outreach_team_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_team_tenant_id_name_key" ON "outreach_team"("tenant_id", "name");

ALTER TABLE "outreach_team" ADD CONSTRAINT "outreach_team_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "outreach_team_membership" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_team_membership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_team_membership_tenant_id_team_id_party_id_key" ON "outreach_team_membership"("tenant_id", "team_id", "party_id");

ALTER TABLE "outreach_team_membership" ADD CONSTRAINT "outreach_team_membership_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_team_membership" ADD CONSTRAINT "outreach_team_membership_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "outreach_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "outreach_lead" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "company_name" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT,
    "track" TEXT NOT NULL DEFAULT 'Undetermined',
    "why_relevant" TEXT,
    "contact_name" TEXT,
    "contact_designation" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "state" TEXT NOT NULL DEFAULT 'research',
    "lead_originator_id" UUID NOT NULL,
    "opportunity_owner_id" UUID NOT NULL,
    "closer_id" UUID,
    "last_activity_at" TIMESTAMP(3),
    "next_action_note" TEXT,
    "next_action_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "advance_threshold_minor" INTEGER,
    "advance_received_minor" INTEGER NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMP(3),
    "reactivated_from_lead_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "outreach_lead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_lead_tenant_id_team_id_state_idx" ON "outreach_lead"("tenant_id", "team_id", "state");
CREATE INDEX "outreach_lead_tenant_id_opportunity_owner_id_idx" ON "outreach_lead"("tenant_id", "opportunity_owner_id");
CREATE INDEX "outreach_lead_tenant_id_next_action_at_idx" ON "outreach_lead"("tenant_id", "next_action_at");

ALTER TABLE "outreach_lead" ADD CONSTRAINT "outreach_lead_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_lead" ADD CONSTRAINT "outreach_lead_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "outreach_team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- APPEND-ONLY: the outreach/activity timeline (master-context spec §31-33).
CREATE TABLE "outreach_activity" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "actor_party_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "message" TEXT,
    "response" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_activity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_activity_tenant_id_lead_id_occurred_at_idx" ON "outreach_activity"("tenant_id", "lead_id", "occurred_at");

ALTER TABLE "outreach_activity" ADD CONSTRAINT "outreach_activity_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_activity" ADD CONSTRAINT "outreach_activity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "outreach_target" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "team_id" UUID,
    "party_id" UUID,
    "period" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "target_value" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "outreach_target_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_target_tenant_id_scope_team_id_party_id_period_st_idx" ON "outreach_target"("tenant_id", "scope", "team_id", "party_id", "period_start");

ALTER TABLE "outreach_target" ADD CONSTRAINT "outreach_target_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "outreach_check_in" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "check_in_date" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "best_lead_id" UUID,
    "learning" TEXT,
    "blocker" TEXT,
    "tomorrow_plan" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_check_in_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_check_in_tenant_id_party_id_check_in_date_key" ON "outreach_check_in"("tenant_id", "party_id", "check_in_date");

ALTER TABLE "outreach_check_in" ADD CONSTRAINT "outreach_check_in_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "outreach_weekly_report" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "what_worked" TEXT,
    "what_didnt_work" TEXT,
    "strongest_opportunity_id" UUID,
    "biggest_learning" TEXT,
    "next_week_change" TEXT,
    "next_week_target_value" INTEGER,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_weekly_report_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_weekly_report_tenant_id_party_id_week_start_key" ON "outreach_weekly_report"("tenant_id", "party_id", "week_start");

ALTER TABLE "outreach_weekly_report" ADD CONSTRAINT "outreach_weekly_report_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "outreach_team_weekly_assessment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "strongest_performer_id" UUID,
    "strongest_prospect_id" UUID,
    "strongest_vertical" TEXT,
    "biggest_problem" TEXT,
    "biggest_learning" TEXT,
    "next_week_priority" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_team_weekly_assessment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outreach_team_weekly_assessment_tenant_id_team_id_week_sta_key" ON "outreach_team_weekly_assessment"("tenant_id", "team_id", "week_start");

ALTER TABLE "outreach_team_weekly_assessment" ADD CONSTRAINT "outreach_team_weekly_assessment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_team_weekly_assessment" ADD CONSTRAINT "outreach_team_weekly_assessment_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "outreach_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (INV-001)
-- ---------------------------------------------------------------------------

ALTER TABLE "outreach_team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_team" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_team_isolation" ON "outreach_team"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "outreach_team_membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_team_membership" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_team_membership_isolation" ON "outreach_team_membership"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "outreach_lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_lead" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_lead_isolation" ON "outreach_lead"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- APPEND-ONLY: no update, no delete — a wrong fact is corrected by a new
-- activity row, never by editing history (handbook Ch. 02/22, ADR-009).
ALTER TABLE "outreach_activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_activity" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_activity_read" ON "outreach_activity"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_activity_append" ON "outreach_activity"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_activity_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_activity"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

ALTER TABLE "outreach_target" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_target" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_target_isolation" ON "outreach_target"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- APPEND-ONLY: a submitted check-in is a historical fact (field rule,
-- handbook Ch. 02: "if it isn't recorded, it didn't happen").
ALTER TABLE "outreach_check_in" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_check_in" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_check_in_read" ON "outreach_check_in"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_check_in_append" ON "outreach_check_in"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_check_in_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_check_in"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

ALTER TABLE "outreach_weekly_report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_weekly_report" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_weekly_report_read" ON "outreach_weekly_report"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_weekly_report_append" ON "outreach_weekly_report"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_weekly_report_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_weekly_report"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

ALTER TABLE "outreach_team_weekly_assessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_team_weekly_assessment" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_team_weekly_assessment_read" ON "outreach_team_weekly_assessment"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_team_weekly_assessment_append" ON "outreach_team_weekly_assessment"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_team_weekly_assessment_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_team_weekly_assessment"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL
-- ---------------------------------------------------------------------------

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.outreach', 'Outreach', '1.0.0',
  ARRAY[]::text[],
  ARRAY[
    'verity.outreach.team',
    'verity.outreach.team_membership',
    'verity.outreach.lead',
    'verity.outreach.activity',
    'verity.outreach.target',
    'verity.outreach.check_in',
    'verity.outreach.weekly_report',
    'verity.outreach.team_weekly_assessment'
  ],
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.outreach.team', 'verity.capability.outreach', 'Persistent', 'outreach_team', true),
  ('verity.outreach.team_membership', 'verity.capability.outreach', 'Persistent', 'outreach_team_membership', true),
  ('verity.outreach.lead', 'verity.capability.outreach', 'Persistent', 'outreach_lead', true),
  ('verity.outreach.activity', 'verity.capability.outreach', 'Persistent', 'outreach_activity', true),
  ('verity.outreach.target', 'verity.capability.outreach', 'Persistent', 'outreach_target', true),
  ('verity.outreach.check_in', 'verity.capability.outreach', 'Persistent', 'outreach_check_in', true),
  ('verity.outreach.weekly_report', 'verity.capability.outreach', 'Persistent', 'outreach_weekly_report', true),
  ('verity.outreach.team_weekly_assessment', 'verity.capability.outreach', 'Persistent', 'outreach_team_weekly_assessment', true)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- STATE MACHINE: verity.outreach.lead (handbook Ch. 22's authoritative list —
-- 13 linear stages + 5 terminal/negative statuses)
-- ---------------------------------------------------------------------------

INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal) VALUES
  (gen_random_uuid(), 'verity.outreach.lead', 'research',           'Draft',     true,  false),
  (gen_random_uuid(), 'verity.outreach.lead', 'prospect',           'Draft',     false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'contacted',          'Pending',   false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'responded',          'Pending',   false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'qualified',          'Active',    false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'discovery',          'Active',    false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'opportunity',        'Active',    false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'handoff',            'Active',    false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'proposal',           'Active',    false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'negotiation',        'Active',    false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'verbal_yes',         'Active',    false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'invoice_requested',  'Pending',   false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'advance_received',   'Active',    false, false),
  (gen_random_uuid(), 'verity.outreach.lead', 'closed_won',         'Completed', false, true),
  (gen_random_uuid(), 'verity.outreach.lead', 'not_a_fit',          'Cancelled', false, true),
  (gen_random_uuid(), 'verity.outreach.lead', 'unresponsive',       'Cancelled', false, true),
  (gen_random_uuid(), 'verity.outreach.lead', 'lost',               'Cancelled', false, true),
  (gen_random_uuid(), 'verity.outreach.lead', 'deferred',           'Cancelled', false, true),
  (gen_random_uuid(), 'verity.outreach.lead', 'disqualified',       'Cancelled', false, true)
ON CONFLICT (entity_key, key) DO NOTHING;

-- Forward linear path: research -> ... -> closed_won.
INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.outreach.lead', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.outreach.lead' AND t.entity_key = 'verity.outreach.lead'
  AND (f.key, t.key) IN (
    ('research','prospect'),
    ('prospect','contacted'),
    ('contacted','responded'),
    ('responded','qualified'),
    ('qualified','discovery'),
    ('discovery','opportunity'),
    ('opportunity','handoff'),
    ('handoff','proposal'),
    ('proposal','negotiation'),
    ('negotiation','verbal_yes'),
    ('verbal_yes','invoice_requested'),
    ('invoice_requested','advance_received'),
    ('advance_received','closed_won')
  )
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;

-- Any non-terminal stage can end in any of the 5 terminal/negative statuses
-- (handbook Ch. 20 — disqualification/rejection can happen at any point).
INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.outreach.lead', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.outreach.lead' AND t.entity_key = 'verity.outreach.lead'
  AND f.is_terminal = false
  AND t.key IN ('not_a_fit', 'unresponsive', 'lost', 'deferred', 'disqualified')
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;
