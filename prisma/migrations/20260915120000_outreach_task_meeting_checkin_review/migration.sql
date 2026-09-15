-- ---------------------------------------------------------------------------
-- Task 106 Phase 5: OutreachTask, OutreachMeeting, and OutreachCheckIn's
-- review workflow (spec §53-55, §62, §64-71). Hand-authored, same reasoning
-- as every other capability migration in this tree.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_task" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "lead_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "due_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Todo',
    "origin" TEXT NOT NULL,
    "assigned_to_party_id" UUID NOT NULL,
    "assigned_by_party_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "outreach_task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_task_tenant_id_team_id_status_idx" ON "outreach_task"("tenant_id", "team_id", "status");
CREATE INDEX "outreach_task_tenant_id_assigned_to_party_id_status_idx" ON "outreach_task"("tenant_id", "assigned_to_party_id", "status");

ALTER TABLE "outreach_task" ADD CONSTRAINT "outreach_task_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_task" ADD CONSTRAINT "outreach_task_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "outreach_meeting" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "organizer_party_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "location_or_url" TEXT,
    "prep_notes" TEXT,
    "outcome_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "outreach_meeting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_meeting_tenant_id_lead_id_scheduled_at_idx" ON "outreach_meeting"("tenant_id", "lead_id", "scheduled_at");
CREATE INDEX "outreach_meeting_tenant_id_organizer_party_id_scheduled_a_idx" ON "outreach_meeting"("tenant_id", "organizer_party_id", "scheduled_at");

ALTER TABLE "outreach_meeting" ADD CONSTRAINT "outreach_meeting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_meeting" ADD CONSTRAINT "outreach_meeting_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- outreach_check_in's review workflow (additive, existing rows default to
-- Submitted so nothing is silently reclassified).
ALTER TABLE "outreach_check_in" ADD COLUMN "most_important_development" TEXT;
ALTER TABLE "outreach_check_in" ADD COLUMN "needs_attention" TEXT;
ALTER TABLE "outreach_check_in" ADD COLUMN "review_status" TEXT NOT NULL DEFAULT 'Submitted';
ALTER TABLE "outreach_check_in" ADD COLUMN "reviewed_by_party_id" UUID;
ALTER TABLE "outreach_check_in" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "outreach_check_in" ADD COLUMN "leader_feedback" TEXT;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (INV-001) — both new tables are mutable (task status
-- changes, meeting outcomes recorded after the fact), same pattern as
-- outreach_lead and outreach_contact, not append-only.
-- ---------------------------------------------------------------------------

ALTER TABLE "outreach_task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_task" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_task_isolation" ON "outreach_task"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "outreach_meeting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_meeting" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_meeting_isolation" ON "outreach_meeting"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES
  ('verity.outreach.task', 'verity.capability.outreach', 'Persistent', 'outreach_task', true),
  ('verity.outreach.meeting', 'verity.capability.outreach', 'Persistent', 'outreach_meeting', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.task')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.task' = ANY(entity_types));

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.meeting')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.meeting' = ANY(entity_types));
