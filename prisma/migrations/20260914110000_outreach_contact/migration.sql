-- ---------------------------------------------------------------------------
-- Task 106 Phase 3: OutreachContact — a named contact person at a prospect
-- company (spec §24-25). Separate from outreach_lead (the company). Mutable
-- (not append-only) — a contact's title/phone/email get corrected in place,
-- unlike the activity timeline. Hand-authored, same reasoning as every other
-- capability migration in this tree.
-- ---------------------------------------------------------------------------

CREATE TABLE "outreach_contact" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "designation" TEXT,
    "department" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin_url" TEXT,
    "classification" TEXT NOT NULL DEFAULT 'Unknown',
    "notes" TEXT,
    "last_contacted_at" TIMESTAMP(3),
    "created_by_party_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "outreach_contact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outreach_contact_tenant_id_lead_id_idx" ON "outreach_contact"("tenant_id", "lead_id");

ALTER TABLE "outreach_contact" ADD CONSTRAINT "outreach_contact_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outreach_contact" ADD CONSTRAINT "outreach_contact_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "outreach_lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outreach_contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_contact" FORCE ROW LEVEL SECURITY;
CREATE POLICY "outreach_contact_isolation" ON "outreach_contact"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.outreach.contact', 'verity.capability.outreach', 'Persistent', 'outreach_contact', true)
ON CONFLICT (key) DO NOTHING;

UPDATE "capability_definition"
SET entity_types = array_append(entity_types, 'verity.outreach.contact')
WHERE id = 'verity.capability.outreach' AND NOT ('verity.outreach.contact' = ANY(entity_types));
