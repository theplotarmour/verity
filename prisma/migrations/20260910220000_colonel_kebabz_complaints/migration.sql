-- ---------------------------------------------------------------------------
-- Colonel Kebabz Phase 2 (lean V1): Complaints + Service Recovery (PRD §36-37)
-- ---------------------------------------------------------------------------
-- Hand-isolated from `prisma migrate diff` — same reasoning as prior slices:
-- the live DB still carries unrelated pre-existing drift from
-- `20260904180000_trading_capability_extraction`, untouched here.

CREATE TABLE "complaint" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "customer_id" UUID,
    "order_id" UUID,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assigned_to_user_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'New',
    "resolution" TEXT,
    "compensation_type" TEXT,
    "compensation_value" INTEGER,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "complaint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "complaint_tenant_id_status_idx" ON "complaint"("tenant_id", "status");

CREATE INDEX "complaint_tenant_id_location_id_idx" ON "complaint"("tenant_id", "location_id");

ALTER TABLE "complaint" ADD CONSTRAINT "complaint_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "complaint" ADD CONSTRAINT "complaint_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "complaint" ADD CONSTRAINT "complaint_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "complaint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "complaint" FORCE ROW LEVEL SECURITY;
CREATE POLICY "complaint_isolation" ON "complaint"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: Complaint (Colonel Kebabz Phase 2)
-- ---------------------------------------------------------------------------

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.complaint', 'Complaint', '1.0.0',
  ARRAY['verity.capability.crm', 'verity.capability.dinein'],
  ARRAY['verity.complaint.complaint'],
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.complaint.complaint', 'verity.capability.complaint', 'Persistent', 'complaint', true)
ON CONFLICT (key) DO NOTHING;
