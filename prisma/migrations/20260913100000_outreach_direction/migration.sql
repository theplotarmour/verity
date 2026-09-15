-- ---------------------------------------------------------------------------
-- Task 105 Phase 2: OutreachDirection — company-wide direction (master-
-- context spec §10-11). Hand-authored, same reasoning as every other
-- capability migration in this tree.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_direction" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "week_label" TEXT NOT NULL,
    "priority_vertical" TEXT,
    "primary_track" TEXT NOT NULL DEFAULT 'Undetermined',
    "company_prospecting_target" INTEGER,
    "strategic_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "posted_by_id" UUID NOT NULL,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_direction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_direction_tenant_id_posted_at_idx" ON "outreach_direction"("tenant_id", "posted_at");

ALTER TABLE "outreach_direction" ADD CONSTRAINT "outreach_direction_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- APPEND-ONLY: a new direction supersedes the old one, never edits it.
ALTER TABLE "outreach_direction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_direction" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_direction_read" ON "outreach_direction"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_direction_append" ON "outreach_direction"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_direction_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_direction"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.outreach.direction', 'verity.capability.outreach', 'Persistent', 'outreach_direction', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.direction')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.direction' = ANY(entity_types));
