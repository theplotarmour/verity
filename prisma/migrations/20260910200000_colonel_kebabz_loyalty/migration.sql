-- ---------------------------------------------------------------------------
-- Colonel Kebabz Phase 2 (lean V1): Loyalty points (PRD §31)
-- ---------------------------------------------------------------------------
-- Hand-isolated from `prisma migrate diff` — same reasoning as prior slices:
-- the live DB still carries unrelated pre-existing drift from
-- `20260904180000_trading_capability_extraction`, untouched here.

CREATE TABLE "loyalty_point_entry" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "bill_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_point_entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loyalty_point_entry_tenant_id_customer_id_idx" ON "loyalty_point_entry"("tenant_id", "customer_id");

ALTER TABLE "loyalty_point_entry" ADD CONSTRAINT "loyalty_point_entry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loyalty_point_entry" ADD CONSTRAINT "loyalty_point_entry_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Append-only ledger, same reasoning as inventory_stock_movement: a wrong
-- entry is corrected by a reversing "adjustment" row, never edited in place.
ALTER TABLE "loyalty_point_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "loyalty_point_entry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_point_entry_read" ON "loyalty_point_entry"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "loyalty_point_entry_append" ON "loyalty_point_entry"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "loyalty_point_entry_append_only"
  BEFORE UPDATE OR DELETE ON "loyalty_point_entry"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: Loyalty (Colonel Kebabz Phase 2)
-- ---------------------------------------------------------------------------

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.loyalty', 'Loyalty', '1.0.0',
  ARRAY['verity.capability.crm', 'verity.capability.dinein'],
  ARRAY['verity.loyalty.point_entry'],
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.loyalty.point_entry', 'verity.capability.loyalty', 'Persistent', 'loyalty_point_entry', true)
ON CONFLICT (key) DO NOTHING;
