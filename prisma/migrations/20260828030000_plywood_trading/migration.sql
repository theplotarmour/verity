-- ---------------------------------------------------------------------------
-- CAPABILITY: Plywood trading -- stages 3 and 4, partners and orders
--
-- Requirement source: plywood.md §1.2 (supplier master, supplier pricing,
-- purchase orders, goods received) and §1.3 (customer master, sales orders,
-- price lists, customer pricing, credit limits). P5 (a reservation table) is
-- resolved in implementation/plywood-decisions.md.
--
-- Purchase and sale are built together because they are the same shape pointing
-- in opposite directions. They are NOT one table with a direction flag: credit
-- limits, partial receipts and reservations are three different sets of rules,
-- and collapsing them would produce a discriminated union nobody can read.
--
-- Capability install. `git diff --stat src/server/platform/`: empty.
-- ---------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "plywood_supplier" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "gstin" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "state_code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plywood_supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_supplier_price" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "negotiated_cost_paise" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "plywood_supplier_price_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_customer" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "gstin" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "state_code" TEXT,
    "credit_limit_paise" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plywood_customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_customer_price" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "custom_price_paise" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "plywood_customer_price_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_purchase_order" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "reference" TEXT,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "total_cost_paise" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plywood_purchase_order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_purchase_order_line" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "hsn_code_snapshot" TEXT NOT NULL,
    "qty_ordered" INTEGER NOT NULL,
    "qty_received" INTEGER NOT NULL DEFAULT 0,
    "unit_cost_paise" INTEGER NOT NULL,

    CONSTRAINT "plywood_purchase_order_line_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_sales_order" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "reference" TEXT,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "total_price_paise" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plywood_sales_order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_sales_order_line" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sales_order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "hsn_code_snapshot" TEXT NOT NULL,
    "qty_ordered" INTEGER NOT NULL,
    "qty_shipped" INTEGER NOT NULL DEFAULT 0,
    "unit_price_paise" INTEGER NOT NULL,

    CONSTRAINT "plywood_sales_order_line_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_stock_reservation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "sales_order_id" UUID NOT NULL,
    "qty_units" INTEGER NOT NULL,
    "released_at" TIMESTAMP(3),
    "release_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "plywood_stock_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plywood_supplier_tenant_id_id_key" ON "plywood_supplier"("tenant_id", "id");
CREATE INDEX "plywood_supplier_tenant_id_display_name_idx" ON "plywood_supplier"("tenant_id", "display_name");
CREATE UNIQUE INDEX "plywood_supplier_price_tenant_supplier_product_key" ON "plywood_supplier_price"("tenant_id", "supplier_id", "product_id");
CREATE UNIQUE INDEX "plywood_customer_tenant_id_id_key" ON "plywood_customer"("tenant_id", "id");
CREATE INDEX "plywood_customer_tenant_id_display_name_idx" ON "plywood_customer"("tenant_id", "display_name");
CREATE UNIQUE INDEX "plywood_customer_price_tenant_customer_product_key" ON "plywood_customer_price"("tenant_id", "customer_id", "product_id");
CREATE UNIQUE INDEX "plywood_purchase_order_tenant_id_id_key" ON "plywood_purchase_order"("tenant_id", "id");
CREATE INDEX "plywood_purchase_order_tenant_id_state_idx" ON "plywood_purchase_order"("tenant_id", "state");
CREATE UNIQUE INDEX "plywood_purchase_order_line_tenant_id_id_key" ON "plywood_purchase_order_line"("tenant_id", "id");
CREATE UNIQUE INDEX "plywood_purchase_order_line_tenant_order_product_key" ON "plywood_purchase_order_line"("tenant_id", "purchase_order_id", "product_id");
CREATE UNIQUE INDEX "plywood_sales_order_tenant_id_id_key" ON "plywood_sales_order"("tenant_id", "id");
CREATE INDEX "plywood_sales_order_tenant_id_state_idx" ON "plywood_sales_order"("tenant_id", "state");
CREATE UNIQUE INDEX "plywood_sales_order_line_tenant_id_id_key" ON "plywood_sales_order_line"("tenant_id", "id");
CREATE UNIQUE INDEX "plywood_sales_order_line_tenant_order_product_key" ON "plywood_sales_order_line"("tenant_id", "sales_order_id", "product_id");
CREATE INDEX "plywood_stock_reservation_tenant_product_location_released_idx" ON "plywood_stock_reservation"("tenant_id", "product_id", "location_id", "released_at");
CREATE INDEX "plywood_stock_reservation_tenant_id_sales_order_id_idx" ON "plywood_stock_reservation"("tenant_id", "sales_order_id");

-- AddForeignKey
-- Every reference is composite on (tenant_id, id). A single-column reference
-- would be satisfiable across the tenant boundary (INV-001).
ALTER TABLE "plywood_supplier" ADD CONSTRAINT "plywood_supplier_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_customer" ADD CONSTRAINT "plywood_customer_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plywood_supplier_price" ADD CONSTRAINT "plywood_supplier_price_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_supplier_price" ADD CONSTRAINT "plywood_supplier_price_supplier_fkey"
  FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "plywood_supplier"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "plywood_supplier_price" ADD CONSTRAINT "plywood_supplier_price_product_fkey"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "plywood_product"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "plywood_customer_price" ADD CONSTRAINT "plywood_customer_price_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_customer_price" ADD CONSTRAINT "plywood_customer_price_customer_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "plywood_customer"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "plywood_customer_price" ADD CONSTRAINT "plywood_customer_price_product_fkey"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "plywood_product"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "plywood_purchase_order" ADD CONSTRAINT "plywood_purchase_order_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_purchase_order" ADD CONSTRAINT "plywood_purchase_order_supplier_fkey"
  FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "plywood_supplier"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_purchase_order" ADD CONSTRAINT "plywood_purchase_order_location_fkey"
  FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_purchase_order_line" ADD CONSTRAINT "plywood_purchase_order_line_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_purchase_order_line" ADD CONSTRAINT "plywood_purchase_order_line_order_fkey"
  FOREIGN KEY ("tenant_id", "purchase_order_id") REFERENCES "plywood_purchase_order"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "plywood_purchase_order_line" ADD CONSTRAINT "plywood_purchase_order_line_product_fkey"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "plywood_product"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_sales_order" ADD CONSTRAINT "plywood_sales_order_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_sales_order" ADD CONSTRAINT "plywood_sales_order_customer_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "plywood_customer"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_sales_order" ADD CONSTRAINT "plywood_sales_order_location_fkey"
  FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_sales_order_line" ADD CONSTRAINT "plywood_sales_order_line_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_sales_order_line" ADD CONSTRAINT "plywood_sales_order_line_order_fkey"
  FOREIGN KEY ("tenant_id", "sales_order_id") REFERENCES "plywood_sales_order"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "plywood_sales_order_line" ADD CONSTRAINT "plywood_sales_order_line_product_fkey"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "plywood_product"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_stock_reservation" ADD CONSTRAINT "plywood_stock_reservation_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_stock_reservation" ADD CONSTRAINT "plywood_stock_reservation_product_fkey"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "plywood_product"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_stock_reservation" ADD CONSTRAINT "plywood_stock_reservation_location_fkey"
  FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_stock_reservation" ADD CONSTRAINT "plywood_stock_reservation_order_fkey"
  FOREIGN KEY ("tenant_id", "sales_order_id") REFERENCES "plywood_sales_order"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Tenant isolation (INV-001)
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_supplier" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_supplier_price" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_supplier_price" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_customer" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_customer_price" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_customer_price" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_purchase_order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_purchase_order" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_purchase_order_line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_purchase_order_line" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_sales_order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_sales_order" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_sales_order_line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_sales_order_line" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_stock_reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_stock_reservation" FORCE ROW LEVEL SECURITY;

CREATE POLICY "plywood_supplier_isolation" ON "plywood_supplier"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_supplier_price_isolation" ON "plywood_supplier_price"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_customer_isolation" ON "plywood_customer"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_customer_price_isolation" ON "plywood_customer_price"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_purchase_order_isolation" ON "plywood_purchase_order"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_purchase_order_line_isolation" ON "plywood_purchase_order_line"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_sales_order_isolation" ON "plywood_sales_order"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_sales_order_line_isolation" ON "plywood_sales_order_line"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_stock_reservation_isolation" ON "plywood_stock_reservation"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- Facts the application must not be trusted to remember
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_customer" ADD CONSTRAINT "plywood_customer_credit_limit_non_negative"
  CHECK ("credit_limit_paise" >= 0);

-- A GSTIN is 15 characters in a fixed shape. Checked here rather than only in
-- the command, because an invoice carrying a malformed one is rejected by a
-- filing weeks later, long after anyone remembers typing it.
ALTER TABLE "plywood_customer" ADD CONSTRAINT "plywood_customer_gstin_shape"
  CHECK ("gstin" IS NULL OR "gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$');
ALTER TABLE "plywood_supplier" ADD CONSTRAINT "plywood_supplier_gstin_shape"
  CHECK ("gstin" IS NULL OR "gstin" ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$');

-- Two digits, the GST state code. It decides CGST + SGST against IGST (P4), so
-- a malformed one silently misclassifies every invoice to that party.
ALTER TABLE "plywood_customer" ADD CONSTRAINT "plywood_customer_state_code_shape"
  CHECK ("state_code" IS NULL OR "state_code" ~ '^[0-9]{2}$');
ALTER TABLE "plywood_supplier" ADD CONSTRAINT "plywood_supplier_state_code_shape"
  CHECK ("state_code" IS NULL OR "state_code" ~ '^[0-9]{2}$');

ALTER TABLE "plywood_supplier_price" ADD CONSTRAINT "plywood_supplier_price_non_negative"
  CHECK ("negotiated_cost_paise" >= 0);
ALTER TABLE "plywood_customer_price" ADD CONSTRAINT "plywood_customer_price_non_negative"
  CHECK ("custom_price_paise" >= 0);

-- Ordered quantities are positive; received and shipped can be zero but never
-- more than ordered. Over-receipt is a real event and is handled by amending the
-- order, not by letting a line quietly exceed itself — otherwise "what is still
-- owed" goes negative and every outstanding report inherits the nonsense.
ALTER TABLE "plywood_purchase_order_line" ADD CONSTRAINT "plywood_purchase_order_line_qty_sane"
  CHECK ("qty_ordered" > 0 AND "qty_received" >= 0 AND "qty_received" <= "qty_ordered");
ALTER TABLE "plywood_purchase_order_line" ADD CONSTRAINT "plywood_purchase_order_line_cost_non_negative"
  CHECK ("unit_cost_paise" >= 0);
ALTER TABLE "plywood_sales_order_line" ADD CONSTRAINT "plywood_sales_order_line_qty_sane"
  CHECK ("qty_ordered" > 0 AND "qty_shipped" >= 0 AND "qty_shipped" <= "qty_ordered");
ALTER TABLE "plywood_sales_order_line" ADD CONSTRAINT "plywood_sales_order_line_price_non_negative"
  CHECK ("unit_price_paise" >= 0);

ALTER TABLE "plywood_purchase_order" ADD CONSTRAINT "plywood_purchase_order_total_non_negative"
  CHECK ("total_cost_paise" >= 0);
ALTER TABLE "plywood_sales_order" ADD CONSTRAINT "plywood_sales_order_total_non_negative"
  CHECK ("total_price_paise" >= 0);

-- A reservation of zero holds nothing.
ALTER TABLE "plywood_stock_reservation" ADD CONSTRAINT "plywood_stock_reservation_qty_positive"
  CHECK ("qty_units" > 0);
-- A release has a reason, for the same argument as an adjustment: the question
-- is asked later, and "it was released" is not an answer.
ALTER TABLE "plywood_stock_reservation" ADD CONSTRAINT "plywood_stock_reservation_release_reason"
  CHECK ("released_at" IS NULL OR "release_reason" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Registration -- DATA, not schema
-- ---------------------------------------------------------------------------

UPDATE "capability_definition"
   SET version = '0.4.0',
       entity_types = ARRAY[
         'verity.plywood.brand','verity.plywood.product','verity.plywood.godown_rack',
         'verity.plywood.stock_ledger','verity.plywood.stock_balance',
         'verity.plywood.supplier','verity.plywood.supplier_price',
         'verity.plywood.customer','verity.plywood.customer_price',
         'verity.plywood.purchase_order','verity.plywood.purchase_order_line',
         'verity.plywood.sales_order','verity.plywood.sales_order_line',
         'verity.plywood.reservation'
       ],
       updated_at = now()
 WHERE id = 'verity.capability.plywood';

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.plywood.supplier',            'verity.capability.plywood', 'Persistent', 'plywood_supplier',            true),
  ('verity.plywood.supplier_price',      'verity.capability.plywood', 'Persistent', 'plywood_supplier_price',      true),
  ('verity.plywood.customer',            'verity.capability.plywood', 'Persistent', 'plywood_customer',            true),
  ('verity.plywood.customer_price',      'verity.capability.plywood', 'Persistent', 'plywood_customer_price',      true),
  ('verity.plywood.purchase_order',      'verity.capability.plywood', 'Persistent', 'plywood_purchase_order',      true),
  ('verity.plywood.purchase_order_line', 'verity.capability.plywood', 'Persistent', 'plywood_purchase_order_line', true),
  ('verity.plywood.sales_order',         'verity.capability.plywood', 'Persistent', 'plywood_sales_order',         true),
  ('verity.plywood.sales_order_line',    'verity.capability.plywood', 'Persistent', 'plywood_sales_order_line',    true),
  ('verity.plywood.reservation',         'verity.capability.plywood', 'Persistent', 'plywood_stock_reservation',   true)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- State machines (plywood.md §7.1, §7.2)
--
-- Categories are declared honestly, because that is what makes the SLA and
-- reporting substrate work with no clock code here (ADR-009). Only Completed and
-- Cancelled may be terminal.
--
-- `pending_credit` is Blocked, not Pending: the order is not waiting its turn,
-- it is stopped until someone with authority acts. A Pending category would let
-- an SLA clock keep running on a delay the business chose.
-- ---------------------------------------------------------------------------

INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal) VALUES
  -- Purchase order. `receiving` is Active and covers a partial receipt; the
  -- order completes only when every line is fully received.
  (gen_random_uuid(), 'verity.plywood.purchase_order', 'draft',     'Draft',     true,  false),
  (gen_random_uuid(), 'verity.plywood.purchase_order', 'submitted', 'Pending',   false, false),
  (gen_random_uuid(), 'verity.plywood.purchase_order', 'receiving', 'Active',    false, false),
  (gen_random_uuid(), 'verity.plywood.purchase_order', 'completed', 'Completed', false, true),
  (gen_random_uuid(), 'verity.plywood.purchase_order', 'cancelled', 'Cancelled', false, true),

  -- Sales order.
  (gen_random_uuid(), 'verity.plywood.sales_order', 'draft',          'Draft',     true,  false),
  (gen_random_uuid(), 'verity.plywood.sales_order', 'pending_credit', 'Blocked',   false, false),
  (gen_random_uuid(), 'verity.plywood.sales_order', 'approved',       'Pending',   false, false),
  (gen_random_uuid(), 'verity.plywood.sales_order', 'dispatching',    'Active',    false, false),
  (gen_random_uuid(), 'verity.plywood.sales_order', 'completed',      'Completed', false, true),
  (gen_random_uuid(), 'verity.plywood.sales_order', 'cancelled',      'Cancelled', false, true)
ON CONFLICT (entity_key, key) DO NOTHING;

-- Transitions. No backwards edges: a mis-tapped advance is corrected by a
-- command someone holds, not by walking the machine in reverse, because reverse
-- edges make "what happened here" unanswerable.
INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.plywood.purchase_order', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.plywood.purchase_order' AND t.entity_key = 'verity.plywood.purchase_order'
  AND (f.key, t.key) IN (
    ('draft','submitted'), ('draft','cancelled'),
    ('submitted','receiving'), ('submitted','cancelled'),
    -- Straight to completed when a single delivery clears the whole order.
    ('submitted','completed'),
    ('receiving','completed'), ('receiving','cancelled'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.plywood.sales_order', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.plywood.sales_order' AND t.entity_key = 'verity.plywood.sales_order'
  AND (f.key, t.key) IN (
    ('draft','pending_credit'), ('draft','approved'), ('draft','cancelled'),
    ('pending_credit','approved'), ('pending_credit','cancelled'),
    ('approved','dispatching'), ('approved','cancelled'),
    ('dispatching','completed'), ('dispatching','cancelled'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;
