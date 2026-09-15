-- ---------------------------------------------------------------------------
-- Task 106 Phase 5 correction: the previous migration
-- (20260915120000_outreach_task_meeting_checkin_review) added review-status
-- columns directly on outreach_check_in, not realizing that table already
-- carries a hard append-only trigger (reject_mutation(), from the original
-- capability migration) that blocks every UPDATE. Those 4 columns were
-- never successfully written by any command — dropping them and replacing
-- with a proper append-only review table, one row per review action.
-- ---------------------------------------------------------------------------

ALTER TABLE "outreach_check_in" DROP COLUMN "review_status";
ALTER TABLE "outreach_check_in" DROP COLUMN "reviewed_by_party_id";
ALTER TABLE "outreach_check_in" DROP COLUMN "reviewed_at";
ALTER TABLE "outreach_check_in" DROP COLUMN "leader_feedback";

CREATE TABLE "outreach_check_in_review" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "check_in_id" UUID NOT NULL,
    "reviewed_by_party_id" UUID NOT NULL,
    "review_status" TEXT NOT NULL,
    "leader_feedback" TEXT,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_check_in_review_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_check_in_review_tenant_id_check_in_id_reviewed_a_idx" ON "outreach_check_in_review"("tenant_id", "check_in_id", "reviewed_at");

ALTER TABLE "outreach_check_in_review" ADD CONSTRAINT "outreach_check_in_review_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_check_in_review" ADD CONSTRAINT "outreach_check_in_review_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "outreach_check_in"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outreach_check_in_review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_check_in_review" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_check_in_review_read" ON "outreach_check_in_review"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "outreach_check_in_review_append" ON "outreach_check_in_review"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "outreach_check_in_review_append_only"
  BEFORE UPDATE OR DELETE ON "outreach_check_in_review"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.outreach.check_in_review', 'verity.capability.outreach', 'Persistent', 'outreach_check_in_review', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.check_in_review')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.check_in_review' = ANY(entity_types));
