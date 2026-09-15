-- ---------------------------------------------------------------------------
-- Task 106 Phase 6: OutreachCoachingNote — append-only (spec §79).
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_coaching_note" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "lead_id" UUID,
    "about_party_id" UUID NOT NULL,
    "author_party_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'JuniorVisible',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_coaching_note_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_coaching_note_tenant_id_team_id_about_party_id_c_idx" ON "outreach_coaching_note"("tenant_id", "team_id", "about_party_id", "created_at");

ALTER TABLE "outreach_coaching_note" ADD CONSTRAINT "outreach_coaching_note_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_coaching_note" ADD CONSTRAINT "outreach_coaching_note_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "outreach_coaching_note" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_coaching_note" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_coaching_note_read" ON "outreach_coaching_note"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_coaching_note_append" ON "outreach_coaching_note"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_coaching_note_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_coaching_note"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.outreach.coaching_note', 'verity.capability.outreach', 'Persistent', 'outreach_coaching_note', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.coaching_note')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.coaching_note' = ANY(entity_types));
