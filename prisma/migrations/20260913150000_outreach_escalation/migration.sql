-- Founder Escalation Queue (master-context spec §57).
ALTER TABLE "outreach_lead"
  ADD COLUMN "escalated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "escalation_note" TEXT,
  ADD COLUMN "escalated_by_id" UUID,
  ADD COLUMN "escalated_at" TIMESTAMP(3);

CREATE INDEX "outreach_lead_tenant_id_escalated_idx" ON "outreach_lead"("tenant_id", "escalated");
