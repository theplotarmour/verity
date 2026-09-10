-- ---------------------------------------------------------------------------
-- Colonel Kebabz Phase 1: Wastage Management (PRD §20), decision 2026-09-10
-- ---------------------------------------------------------------------------
-- Hand-isolated from `prisma migrate diff`, same reasoning as the Recipe/BOM
-- migration: the live DB still carries unrelated pre-existing drift from
-- `20260904180000_trading_capability_extraction` that a full diff bundles
-- in. Untouched here, tracked separately.

CREATE TABLE "inventory_wastage_record" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "movement_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "value_paise" INTEGER NOT NULL,
    "notes" TEXT,
    "evidence_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_wastage_record_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_wastage_record_movement_id_key" ON "inventory_wastage_record"("movement_id");

ALTER TABLE "inventory_wastage_record" ADD CONSTRAINT "inventory_wastage_record_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_wastage_record" ADD CONSTRAINT "inventory_wastage_record_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "inventory_stock_movement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Append-only, same reasoning as inventory_stock_movement: a wastage record
-- is a historical fact (ADR-009). A wrong reason/value is corrected by a
-- reversing Adjustment + a new wastage record, never by editing this row.
ALTER TABLE "inventory_wastage_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_wastage_record" FORCE ROW LEVEL SECURITY;
CREATE POLICY "inventory_wastage_record_read" ON "inventory_wastage_record"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "inventory_wastage_record_append" ON "inventory_wastage_record"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "inventory_wastage_record_append_only"
  BEFORE UPDATE OR DELETE ON "inventory_wastage_record"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();
