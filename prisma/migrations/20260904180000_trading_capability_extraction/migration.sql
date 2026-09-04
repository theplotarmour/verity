-- ===========================================================================
-- ADR-018: extract a generic Trading capability out of plywood.
--
-- Every rename below is `ALTER TABLE ... RENAME TO ...` — data-preserving.
-- Postgres does not require constraint/index names to match the table name
-- for correctness, so this migration does NOT rename the ~40 auto-generated
-- FK/index/constraint names still carrying the old table prefix (e.g.
-- `plywood_invoice_tenant_id_fkey` on the now-renamed `trading_invoice`).
-- That is a cosmetic follow-up, not a correctness requirement, and doing it
-- by hand for forty names against live tenant data was judged a worse risk
-- than leaving them as-is.
--
-- `Activity`/`DomainEvent.commandKey` history is deliberately NOT rewritten
-- (append-only, same principle as the ledger tables themselves) — old rows
-- keep their `verity.plywood.*` command keys, and
-- `src/components/ui/business/vocabulary.ts` maps both old and new keys to
-- the same label, permanently.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Rename the 28 generic tables. Constraints/indexes travel with the table
--    automatically; only the table's own name changes.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_brand" RENAME TO "trading_brand";
ALTER TABLE "plywood_supplier" RENAME TO "trading_supplier";
ALTER TABLE "plywood_supplier_price" RENAME TO "trading_supplier_price";
ALTER TABLE "plywood_customer" RENAME TO "trading_customer";
ALTER TABLE "plywood_customer_price" RENAME TO "trading_customer_price";
ALTER TABLE "plywood_purchase_order" RENAME TO "trading_purchase_order";
ALTER TABLE "plywood_purchase_order_line" RENAME TO "trading_purchase_order_line";
ALTER TABLE "plywood_sales_order" RENAME TO "trading_sales_order";
ALTER TABLE "plywood_sales_order_line" RENAME TO "trading_sales_order_line";
ALTER TABLE "plywood_stock_reservation" RENAME TO "trading_stock_reservation";
ALTER TABLE "plywood_goods_receipt" RENAME TO "trading_goods_receipt";
ALTER TABLE "plywood_goods_receipt_line" RENAME TO "trading_goods_receipt_line";
ALTER TABLE "plywood_goods_issue" RENAME TO "trading_goods_issue";
ALTER TABLE "plywood_goods_issue_line" RENAME TO "trading_goods_issue_line";
ALTER TABLE "plywood_business_profile" RENAME TO "trading_business_profile";
ALTER TABLE "plywood_gst_registration" RENAME TO "trading_gst_registration";
ALTER TABLE "plywood_invoice_series" RENAME TO "trading_invoice_series";
ALTER TABLE "plywood_invoice" RENAME TO "trading_invoice";
ALTER TABLE "plywood_invoice_line" RENAME TO "trading_invoice_line";
ALTER TABLE "plywood_payment" RENAME TO "trading_payment";
ALTER TABLE "plywood_payment_allocation" RENAME TO "trading_payment_allocation";
ALTER TABLE "plywood_purchase_bill_confirmation" RENAME TO "trading_purchase_bill_confirmation";
ALTER TABLE "plywood_accounting_period" RENAME TO "trading_accounting_period";
ALTER TABLE "plywood_tax_rule" RENAME TO "trading_tax_rule";
ALTER TABLE "plywood_invoice_note" RENAME TO "trading_invoice_note";
ALTER TABLE "plywood_ledger_entry" RENAME TO "trading_ledger_entry";
ALTER TABLE "plywood_gst_portal_record" RENAME TO "trading_gst_portal_record";
ALTER TABLE "plywood_metric_snapshot" RENAME TO "trading_metric_snapshot";

-- `GodownRack`/`StockLedgerEntry`/`StockBalance` were never `plywood_`-
-- prefixed at the table level — nothing to rename there, only ownership
-- (which capability's code touches them) moved.

-- ---------------------------------------------------------------------------
-- 2. Split `plywood_product` into the generic `trading_product` base and
--    plywood's own `plywood_product_detail` extension (ADR-018's
--    capability-owned-extension pattern).
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_product" RENAME TO "trading_product";

-- The four dimension/grade CHECK constraints and the weight constraint
-- reference columns that are about to move — drop them before the columns.
ALTER TABLE "trading_product" DROP CONSTRAINT IF EXISTS "plywood_product_dimensions_positive";
ALTER TABLE "trading_product" DROP CONSTRAINT IF EXISTS "plywood_product_category_known";
ALTER TABLE "trading_product" DROP CONSTRAINT IF EXISTS "plywood_product_size_unit_known";
ALTER TABLE "trading_product" DROP CONSTRAINT IF EXISTS "plywood_product_laminate_is_eight_by_four";
ALTER TABLE "trading_product" DROP CONSTRAINT IF EXISTS "plywood_product_weight_positive";

CREATE TABLE "plywood_product_detail" (
    "product_id"          UUID NOT NULL,
    "tenant_id"           UUID NOT NULL,
    "thickness_tenth_mm"  INTEGER,
    "category"            TEXT NOT NULL DEFAULT 'OTHER',
    "size_unit"           TEXT NOT NULL DEFAULT 'MM',
    "width_tenth"         INTEGER,
    "height_tenth"        INTEGER,
    "grade"               TEXT NOT NULL,
    "sheet_weight_grams"  INTEGER,

    CONSTRAINT "plywood_product_detail_pkey" PRIMARY KEY ("product_id")
);

-- Backfill from the base table before its dimension columns are dropped.
INSERT INTO "plywood_product_detail"
  ("product_id", "tenant_id", "thickness_tenth_mm", "category", "size_unit",
   "width_tenth", "height_tenth", "grade", "sheet_weight_grams")
SELECT "id", "tenant_id", "thickness_tenth_mm", "category", "size_unit",
       "width_tenth", "height_tenth", "grade", "sheet_weight_grams"
  FROM "trading_product";

ALTER TABLE "trading_product"
  DROP COLUMN "thickness_tenth_mm",
  DROP COLUMN "category",
  DROP COLUMN "size_unit",
  DROP COLUMN "width_tenth",
  DROP COLUMN "height_tenth",
  DROP COLUMN "grade",
  DROP COLUMN "sheet_weight_grams";

ALTER TABLE "plywood_product_detail" ADD CONSTRAINT "plywood_product_detail_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_product_detail" ADD CONSTRAINT "plywood_product_detail_product_fkey"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "trading_product"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
CREATE UNIQUE INDEX "plywood_product_detail_tenant_id_product_id_key"
  ON "plywood_product_detail"("tenant_id", "product_id");

ALTER TABLE "plywood_product_detail" ADD CONSTRAINT "plywood_product_detail_dimensions_positive"
  CHECK (
    ("thickness_tenth_mm" IS NULL OR "thickness_tenth_mm" > 0) AND
    ("width_tenth"  IS NULL OR "width_tenth"  > 0) AND
    ("height_tenth" IS NULL OR "height_tenth" > 0)
  );
ALTER TABLE "plywood_product_detail" ADD CONSTRAINT "plywood_product_detail_category_known"
  CHECK ("category" IN ('BOARD', 'PLYWOOD', 'LAMINATE', 'LOUVRE', 'OTHER'));
ALTER TABLE "plywood_product_detail" ADD CONSTRAINT "plywood_product_detail_size_unit_known"
  CHECK ("size_unit" IN ('MM', 'FT', 'IN'));
ALTER TABLE "plywood_product_detail" ADD CONSTRAINT "plywood_product_detail_laminate_is_eight_by_four"
  CHECK (
    "category" <> 'LAMINATE'
    OR ("width_tenth" = 80 AND "height_tenth" = 40 AND "size_unit" = 'FT')
  );
ALTER TABLE "plywood_product_detail" ADD CONSTRAINT "plywood_product_detail_weight_positive"
  CHECK ("sheet_weight_grams" IS NULL OR "sheet_weight_grams" > 0);

ALTER TABLE "plywood_product_detail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_product_detail" FORCE ROW LEVEL SECURITY;
CREATE POLICY "plywood_product_detail_isolation" ON "plywood_product_detail"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- 3. Register the new `trading` capability and the product-detail entity;
--    make `plywood` declare its dependency on `trading`.
-- ---------------------------------------------------------------------------

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, created_at, updated_at)
VALUES (
  'verity.capability.trading',
  'Trading',
  '1.0.0',
  ARRAY[]::text[],
  ARRAY[
    'verity.trading.brand', 'verity.trading.product', 'verity.trading.godown_rack',
    'verity.trading.stock_ledger', 'verity.trading.stock_balance',
    'verity.trading.supplier', 'verity.trading.supplier_price',
    'verity.trading.customer', 'verity.trading.customer_price',
    'verity.trading.purchase_order', 'verity.trading.purchase_order_line',
    'verity.trading.sales_order', 'verity.trading.sales_order_line',
    'verity.trading.reservation', 'verity.trading.business_profile',
    'verity.trading.gst_registration', 'verity.trading.accounting_period',
    'verity.trading.invoice', 'verity.trading.payment', 'verity.trading.ledger_entry',
    'verity.trading.metric_snapshot'
  ],
  now(), now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE "capability_definition"
   SET dependencies = ARRAY(SELECT DISTINCT unnest(dependencies || ARRAY['verity.capability.trading']::text[]))
 WHERE id = 'verity.capability.plywood'
   AND NOT ('verity.capability.trading' = ANY(dependencies));

-- CRITICAL: `capability_definition.dependencies` only governs validation of
-- FUTURE activations (the DB trigger fires on tenant_activation writes, not
-- retroactively) — it does not activate anything by itself. Every tenant
-- that already has `plywood` active must also get `trading` active, or
-- every generic entity's `requireCapabilityActive` check starts failing for
-- them the moment this deploys, since none of them have ever activated
-- `verity.capability.trading` (it did not exist before this migration).
INSERT INTO "tenant_activation" (id, tenant_id, capability_id, status, pinned_version)
SELECT gen_random_uuid(), ta.tenant_id, 'verity.capability.trading', 'Active', '1.0.0'
  FROM "tenant_activation" ta
 WHERE ta.capability_id = 'verity.capability.plywood'
   AND ta.status = 'Active'
   AND NOT EXISTS (
     SELECT 1 FROM "tenant_activation" ta2
      WHERE ta2.tenant_id = ta.tenant_id AND ta2.capability_id = 'verity.capability.trading'
   );

-- ---------------------------------------------------------------------------
-- 4. `entity_definition` — insert the new `verity.trading.*` keys pointing
--    at the renamed tables. Old `verity.plywood.*` rows are left in place
--    rather than deleted: they become simply unreferenced once no command
--    or query names them, which is a harmless dead registry entry, not a
--    correctness risk (same reasoning as leaving audit history alone).
-- ---------------------------------------------------------------------------

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.trading.brand',               'verity.capability.trading', 'Persistent', 'trading_brand', true),
  ('verity.trading.customer',            'verity.capability.trading', 'Persistent', 'trading_customer', true),
  ('verity.trading.customer_price',      'verity.capability.trading', 'Persistent', 'trading_customer_price', true),
  ('verity.trading.godown_rack',         'verity.capability.trading', 'Persistent', 'godown_rack', true),
  ('verity.trading.invoice',             'verity.capability.trading', 'Persistent', 'trading_invoice', true),
  ('verity.trading.ledger_entry',        'verity.capability.trading', 'Persistent', 'trading_ledger_entry', true),
  ('verity.trading.metric_snapshot',     'verity.capability.trading', 'Persistent', 'trading_metric_snapshot', true),
  ('verity.trading.payment',             'verity.capability.trading', 'Persistent', 'trading_payment', true),
  ('verity.trading.product',             'verity.capability.trading', 'Persistent', 'trading_product', true),
  ('verity.trading.purchase_order',      'verity.capability.trading', 'Persistent', 'trading_purchase_order', true),
  ('verity.trading.purchase_order_line', 'verity.capability.trading', 'Persistent', 'trading_purchase_order_line', true),
  ('verity.trading.reservation',         'verity.capability.trading', 'Persistent', 'trading_stock_reservation', true),
  ('verity.trading.sales_order',         'verity.capability.trading', 'Persistent', 'trading_sales_order', true),
  ('verity.trading.sales_order_line',    'verity.capability.trading', 'Persistent', 'trading_sales_order_line', true),
  ('verity.trading.stock_balance',       'verity.capability.trading', 'Persistent', 'stock_balance', true),
  ('verity.trading.stock_ledger',        'verity.capability.trading', 'Persistent', 'stock_ledger_entry', true),
  ('verity.trading.supplier',            'verity.capability.trading', 'Persistent', 'trading_supplier', true),
  ('verity.trading.supplier_price',      'verity.capability.trading', 'Persistent', 'trading_supplier_price', true),
  ('verity.trading.business_profile',    'verity.capability.trading', 'Persistent', 'trading_business_profile', true),
  ('verity.trading.gst_registration',    'verity.capability.trading', 'Persistent', 'trading_gst_registration', true),
  ('verity.trading.accounting_period',   'verity.capability.trading', 'Persistent', 'trading_accounting_period', true),
  ('verity.plywood.product_detail',      'verity.capability.plywood', 'Persistent', 'plywood_product_detail', true)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. `permission.entity` — RBAC control data (current state, not a fact
--    about the past), rewritten forward to the new keys. Every existing
--    tenant's grants keep working under the same effective meaning.
-- ---------------------------------------------------------------------------

UPDATE "permission" SET entity = 'verity.trading.brand'             WHERE entity = 'verity.plywood.brand';
UPDATE "permission" SET entity = 'verity.trading.customer'          WHERE entity = 'verity.plywood.customer';
UPDATE "permission" SET entity = 'verity.trading.customer_price'    WHERE entity = 'verity.plywood.customer_price';
UPDATE "permission" SET entity = 'verity.trading.godown_rack'       WHERE entity = 'verity.plywood.godown_rack';
UPDATE "permission" SET entity = 'verity.trading.invoice'           WHERE entity = 'verity.plywood.invoice';
UPDATE "permission" SET entity = 'verity.trading.ledger_entry'      WHERE entity = 'verity.plywood.ledger_entry';
UPDATE "permission" SET entity = 'verity.trading.payment'           WHERE entity = 'verity.plywood.payment';
UPDATE "permission" SET entity = 'verity.trading.product'           WHERE entity = 'verity.plywood.product';
UPDATE "permission" SET entity = 'verity.trading.purchase_order'    WHERE entity = 'verity.plywood.purchase_order';
UPDATE "permission" SET entity = 'verity.trading.purchase_order_line' WHERE entity = 'verity.plywood.purchase_order_line';
UPDATE "permission" SET entity = 'verity.trading.reservation'       WHERE entity = 'verity.plywood.reservation';
UPDATE "permission" SET entity = 'verity.trading.sales_order'       WHERE entity = 'verity.plywood.sales_order';
UPDATE "permission" SET entity = 'verity.trading.sales_order_line'  WHERE entity = 'verity.plywood.sales_order_line';
UPDATE "permission" SET entity = 'verity.trading.stock_balance'     WHERE entity = 'verity.plywood.stock_balance';
UPDATE "permission" SET entity = 'verity.trading.stock_ledger'      WHERE entity = 'verity.plywood.stock_ledger';
UPDATE "permission" SET entity = 'verity.trading.supplier'          WHERE entity = 'verity.plywood.supplier';
UPDATE "permission" SET entity = 'verity.trading.supplier_price'    WHERE entity = 'verity.plywood.supplier_price';
UPDATE "permission" SET entity = 'verity.trading.business_profile'  WHERE entity = 'verity.plywood.business_profile';
UPDATE "permission" SET entity = 'verity.trading.gst_registration'  WHERE entity = 'verity.plywood.gst_registration';
UPDATE "permission" SET entity = 'verity.trading.accounting_period' WHERE entity = 'verity.plywood.accounting_period';

-- `verity.plywood.product` above already covers create/edit/read grants on
-- the product entity; plywood's own `createProduct`/`editProduct` commands
-- still check that same (now-renamed) entity, plus the new
-- `verity.plywood.product_detail` entity for the dimension-specific fields.
-- Existing tenants get Read/Create/Edit on the new detail entity wherever
-- they already held it on the product entity, so nobody loses catalogue
-- access mid-migration.
INSERT INTO "permission" (id, tenant_id, role_id, verb, entity, scope)
SELECT gen_random_uuid(), p.tenant_id, p.role_id, p.verb, 'verity.plywood.product_detail', p.scope
  FROM "permission" p
 WHERE p.entity = 'verity.trading.product'
   AND NOT EXISTS (
     SELECT 1 FROM "permission" p2
      WHERE p2.tenant_id = p.tenant_id AND p2.role_id = p.role_id
        AND p2.verb = p.verb AND p2.entity = 'verity.plywood.product_detail'
        AND p2.scope = p.scope
   );
