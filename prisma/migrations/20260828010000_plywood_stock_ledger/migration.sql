-- ---------------------------------------------------------------------------
-- CAPABILITY: Plywood trading -- stage 2, the stock ledger
--
-- Requirement source: plywood.md §1.1 (stock by godown, inward/outward,
-- transfers, adjustments, damaged and returned stock, low-stock alerts, stock
-- valuation). Decisions: implementation/plywood-decisions.md.
--
-- P1 resolved to weighted average cost. Two tables say the same thing at two
-- speeds: the ledger is the append-only truth, and the balance is a maintained
-- summary whose invariant a test asserts by replaying the ledger.
--
-- Capability install. `git diff --stat src/server/platform/`: empty.
-- ---------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "stock_ledger_entry" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "rack_id" UUID,
    "kind" TEXT NOT NULL,
    "qty_delta_units" INTEGER NOT NULL,
    "unit_cost_paise" INTEGER NOT NULL,
    "reason" TEXT,
    "by_user_id" UUID NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_balance" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "qty_units" INTEGER NOT NULL DEFAULT 0,
    "avg_unit_cost_paise" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "stock_balance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_ledger_entry_tenant_product_location_time_idx"
  ON "stock_ledger_entry"("tenant_id", "product_id", "location_id", "occurred_at");
CREATE INDEX "stock_ledger_entry_tenant_id_occurred_at_idx"
  ON "stock_ledger_entry"("tenant_id", "occurred_at");
CREATE UNIQUE INDEX "stock_balance_tenant_id_product_id_location_id_key"
  ON "stock_balance"("tenant_id", "product_id", "location_id");
CREATE INDEX "stock_balance_tenant_id_location_id_idx"
  ON "stock_balance"("tenant_id", "location_id");

-- AddForeignKey
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_product_fkey"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "plywood_product"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_location_fkey"
  FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_rack_fkey"
  FOREIGN KEY ("tenant_id", "rack_id") REFERENCES "godown_rack"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "stock_balance" ADD CONSTRAINT "stock_balance_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_balance" ADD CONSTRAINT "stock_balance_product_fkey"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "plywood_product"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "stock_balance" ADD CONSTRAINT "stock_balance_location_fkey"
  FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Tenant isolation (INV-001)
-- ---------------------------------------------------------------------------

ALTER TABLE "stock_ledger_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_ledger_entry" FORCE ROW LEVEL SECURITY;
ALTER TABLE "stock_balance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_balance" FORCE ROW LEVEL SECURITY;

-- The ledger takes SELECT and INSERT policies but no UPDATE or DELETE policy.
-- The trigger below refuses those outright; leaving the policies off as well
-- means a mutation is refused twice, by two mechanisms, rather than depending on
-- either one alone.
--
-- [Corrected by 20260828020000_plywood_ledger_fails_loudly. The reasoning above
-- is wrong: with no UPDATE policy the rows are filtered out before the trigger
-- can object, so the statement silently affects nothing and reports success.
-- Left as written because an applied migration is history, not a draft.]
CREATE POLICY "stock_ledger_entry_read" ON "stock_ledger_entry"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "stock_ledger_entry_append" ON "stock_ledger_entry"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());

CREATE POLICY "stock_balance_isolation" ON "stock_balance"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- Append-only, enforced rather than intended
--
-- plywood.md says the stock ledger is append-only. A ledger that is append-only
-- only because no code writes an UPDATE stays append-only exactly until someone
-- writes one. `verity.reject_mutation` is the same function `activity` and
-- `security_audit_event` already use.
-- ---------------------------------------------------------------------------

CREATE TRIGGER "stock_ledger_entry_append_only"
  BEFORE UPDATE OR DELETE ON "stock_ledger_entry"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

-- ---------------------------------------------------------------------------
-- Facts the application must not be trusted to remember
-- ---------------------------------------------------------------------------

-- A movement of zero is not a movement.
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_qty_non_zero"
  CHECK ("qty_delta_units" <> 0);
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_cost_non_negative"
  CHECK ("unit_cost_paise" >= 0);

-- The reason and the direction must agree. Without this the kind is a label
-- that can contradict the arithmetic, and a report grouped by kind would then
-- disagree with the balance it is supposed to explain.
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_kind_direction"
  CHECK (
    ("kind" IN ('purchase_inward', 'transfer_in', 'adjust_in', 'returned_stock') AND "qty_delta_units" > 0)
    OR
    ("kind" IN ('sales_outward', 'transfer_out', 'adjust_out', 'damaged_out') AND "qty_delta_units" < 0)
  );

-- An adjustment without a reason is the entry nobody can explain six months
-- later, which is precisely when it is asked about.
ALTER TABLE "stock_ledger_entry" ADD CONSTRAINT "stock_ledger_entry_adjustment_reason"
  CHECK ("kind" NOT IN ('adjust_in', 'adjust_out', 'damaged_out', 'returned_stock') OR "reason" IS NOT NULL);

-- Stock cannot go negative. This is the constraint that makes "you cannot sell
-- what you do not have" a property of the database rather than a race between
-- two sales representatives.
ALTER TABLE "stock_balance" ADD CONSTRAINT "stock_balance_qty_non_negative"
  CHECK ("qty_units" >= 0);
ALTER TABLE "stock_balance" ADD CONSTRAINT "stock_balance_cost_non_negative"
  CHECK ("avg_unit_cost_paise" >= 0);

-- ---------------------------------------------------------------------------
-- Registration -- DATA, not schema
-- ---------------------------------------------------------------------------

UPDATE "capability_definition"
   SET version = '0.2.0',
       entity_types = ARRAY[
         'verity.plywood.brand','verity.plywood.product','verity.plywood.godown_rack',
         'verity.plywood.stock_ledger','verity.plywood.stock_balance'
       ],
       updated_at = now()
 WHERE id = 'verity.capability.plywood';

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.plywood.stock_ledger',  'verity.capability.plywood', 'Persistent', 'stock_ledger_entry', true),
  ('verity.plywood.stock_balance', 'verity.capability.plywood', 'Persistent', 'stock_balance',      true)
ON CONFLICT (key) DO NOTHING;
