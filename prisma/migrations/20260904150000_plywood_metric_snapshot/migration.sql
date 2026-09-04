-- CreateTable
CREATE TABLE "plywood_metric_snapshot" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "sales_today_paise" INTEGER NOT NULL,
    "stock_value_paise" INTEGER NOT NULL,
    "receivables_paise" INTEGER NOT NULL,
    "payables_paise" INTEGER NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plywood_metric_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plywood_metric_snapshot_tenant_id_snapshot_date_key" ON "plywood_metric_snapshot"("tenant_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "plywood_metric_snapshot" ADD CONSTRAINT "plywood_metric_snapshot_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: plywood metric snapshots (Task 100)
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_metric_snapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_metric_snapshot" FORCE ROW LEVEL SECURITY;

-- Append-only in spirit (a snapshot is a historical fact), but the capture
-- job upserts by (tenant_id, snapshot_date) for same-day idempotency under
-- retry -- a real UPDATE, not a new row, so this is SELECT/INSERT/UPDATE,
-- never DELETE, rather than the reject_mutation trigger pattern used
-- elsewhere for genuinely immutable rows.
CREATE POLICY "plywood_metric_snapshot_isolation" ON "plywood_metric_snapshot"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.plywood.metric_snapshot', 'verity.capability.plywood', 'Persistent', 'plywood_metric_snapshot', true)
ON CONFLICT (key) DO NOTHING;
