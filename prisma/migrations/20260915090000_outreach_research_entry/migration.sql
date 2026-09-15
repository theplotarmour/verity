-- ---------------------------------------------------------------------------
-- Task 106 Phase 4: OutreachResearchEntry — append-only research timeline
-- (spec §26-29). Same append-only pattern as outreach_activity: a wrong
-- entry is corrected by a new entry, never edited.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_research_entry" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "source_url" TEXT,
    "file_id" UUID,
    "created_by_party_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_research_entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_research_entry_tenant_id_lead_id_created_at_idx" ON "outreach_research_entry"("tenant_id", "lead_id", "created_at");

ALTER TABLE "outreach_research_entry" ADD CONSTRAINT "outreach_research_entry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_research_entry" ADD CONSTRAINT "outreach_research_entry_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outreach_research_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_research_entry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_research_entry_read" ON "outreach_research_entry"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_research_entry_append" ON "outreach_research_entry"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_research_entry_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_research_entry"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.outreach.research_entry', 'verity.capability.outreach', 'Persistent', 'outreach_research_entry', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.research_entry')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.research_entry' = ANY(entity_types));
