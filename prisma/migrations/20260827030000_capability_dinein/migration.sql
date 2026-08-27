-- ---------------------------------------------------------------------------
-- CAPABILITY: Dine-in — install
--
-- The first real client requirement: Kent's Restaurant, Defence Colony.
-- Requirement source: KentsRestaurant.md. Gap analysis:
-- implementation/kents-gap-analysis.md.
--
-- This is a CAPABILITY install, not a platform change. PLATFORM-FREEZE names
-- exactly this shape as expected and additive: new tables under a capability's
-- own name, their RLS policies, rows in the platform's registries, and seeded
-- state metadata. Nothing here alters tenancy, authorization, the command
-- runtime, the event runtime or the shell — and if it had needed to, the work
-- would have stopped and the three-question rule would apply instead.
--
-- Structure below follows the Location exemplar: tables, then ENABLE + FORCE
-- RLS, then isolation policies, then registry rows, then states and
-- transitions.
-- ---------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "menu_category" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "menu_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_minor" INTEGER NOT NULL,
    "cost_minor" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_variant" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price_delta_minor" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "menu_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dining_zone" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "floor_label" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "dining_zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dining_table" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 2,
    "shape" TEXT,
    "pos_x" INTEGER NOT NULL DEFAULT 0,
    "pos_y" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "dining_table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dining_order" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "taken_by_user_id" UUID NOT NULL,
    "covers" INTEGER NOT NULL DEFAULT 1,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "placed_at" TIMESTAMP(3),
    "served_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "dining_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_line" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "variant_id" UUID,
    "item_name_snapshot" TEXT NOT NULL,
    "variant_name_snapshot" TEXT,
    "unit_price_minor" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "line_note" TEXT,
    "state" TEXT NOT NULL DEFAULT 'queued',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "order_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "subtotal_minor" INTEGER NOT NULL,
    "discount_minor" INTEGER NOT NULL DEFAULT 0,
    "cgst_rate_bp" INTEGER NOT NULL DEFAULT 0,
    "cgst_minor" INTEGER NOT NULL DEFAULT 0,
    "sgst_rate_bp" INTEGER NOT NULL DEFAULT 0,
    "sgst_minor" INTEGER NOT NULL DEFAULT 0,
    "taxable_minor" INTEGER NOT NULL DEFAULT 0,
    "total_minor" INTEGER NOT NULL,
    "rounding_minor" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'open',
    "generated_by_user_id" UUID NOT NULL,
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "reference" TEXT,
    "received_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_category_tenant_id_sort_order_idx" ON "menu_category"("tenant_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_category_tenant_id_name_key" ON "menu_category"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "menu_category_tenant_id_id_key" ON "menu_category"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "menu_item_tenant_id_category_id_sort_order_idx" ON "menu_item"("tenant_id", "category_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_tenant_id_id_key" ON "menu_item"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_variant_tenant_id_item_id_name_key" ON "menu_variant"("tenant_id", "item_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "menu_variant_tenant_id_id_key" ON "menu_variant"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "dining_zone_tenant_id_name_key" ON "dining_zone"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "dining_zone_tenant_id_id_key" ON "dining_zone"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "dining_table_tenant_id_state_idx" ON "dining_table"("tenant_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "dining_table_tenant_id_label_key" ON "dining_table"("tenant_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "dining_table_tenant_id_id_key" ON "dining_table"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "dining_order_tenant_id_state_idx" ON "dining_order"("tenant_id", "state");

-- CreateIndex
CREATE INDEX "dining_order_tenant_id_table_id_state_idx" ON "dining_order"("tenant_id", "table_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "dining_order_tenant_id_id_key" ON "dining_order"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "order_line_tenant_id_order_id_idx" ON "order_line"("tenant_id", "order_id");

-- CreateIndex
CREATE INDEX "order_line_tenant_id_state_idx" ON "order_line"("tenant_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "order_line_tenant_id_id_key" ON "order_line"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "bill_order_id_key" ON "bill"("order_id");

-- CreateIndex
CREATE INDEX "bill_tenant_id_state_idx" ON "bill"("tenant_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "bill_tenant_id_order_id_key" ON "bill"("tenant_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "bill_tenant_id_id_key" ON "bill"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "payment_tenant_id_bill_id_idx" ON "payment"("tenant_id", "bill_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_tenant_id_id_key" ON "payment"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "menu_category" ADD CONSTRAINT "menu_category_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_tenant_id_category_id_fkey" FOREIGN KEY ("tenant_id", "category_id") REFERENCES "menu_category"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "menu_variant" ADD CONSTRAINT "menu_variant_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_variant" ADD CONSTRAINT "menu_variant_tenant_id_item_id_fkey" FOREIGN KEY ("tenant_id", "item_id") REFERENCES "menu_item"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dining_zone" ADD CONSTRAINT "dining_zone_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_table" ADD CONSTRAINT "dining_table_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_table" ADD CONSTRAINT "dining_table_tenant_id_zone_id_fkey" FOREIGN KEY ("tenant_id", "zone_id") REFERENCES "dining_zone"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dining_order" ADD CONSTRAINT "dining_order_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dining_order" ADD CONSTRAINT "dining_order_tenant_id_table_id_fkey" FOREIGN KEY ("tenant_id", "table_id") REFERENCES "dining_table"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_tenant_id_order_id_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "dining_order"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_tenant_id_item_id_fkey" FOREIGN KEY ("tenant_id", "item_id") REFERENCES "menu_item"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill" ADD CONSTRAINT "bill_tenant_id_order_id_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "dining_order"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_tenant_id_bill_id_fkey" FOREIGN KEY ("tenant_id", "bill_id") REFERENCES "bill"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;


-- ---------------------------------------------------------------------------
-- Row-level security
--
-- Same policy every tenant-scoped table carries. A capability does not get to
-- opt out of INV-001, and FORCE matters: without it the owner role Prisma
-- connects as would silently bypass every policy below while they all still
-- appeared present.
-- ---------------------------------------------------------------------------

ALTER TABLE "menu_category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_category" FORCE ROW LEVEL SECURITY;
ALTER TABLE "menu_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_item" FORCE ROW LEVEL SECURITY;
ALTER TABLE "menu_variant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_variant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dining_zone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dining_zone" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dining_table" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dining_table" FORCE ROW LEVEL SECURITY;
ALTER TABLE "dining_order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dining_order" FORCE ROW LEVEL SECURITY;
ALTER TABLE "order_line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_line" FORCE ROW LEVEL SECURITY;
ALTER TABLE "bill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bill" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment" FORCE ROW LEVEL SECURITY;

CREATE POLICY "menu_category_isolation" ON "menu_category"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "menu_item_isolation" ON "menu_item"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "menu_variant_isolation" ON "menu_variant"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "dining_zone_isolation" ON "dining_zone"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "dining_table_isolation" ON "dining_table"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "dining_order_isolation" ON "dining_order"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "order_line_isolation" ON "order_line"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "bill_isolation" ON "bill"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "payment_isolation" ON "payment"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Money cannot be negative, and a bill's arithmetic should not depend on the
-- application remembering that. Checks belong here for the same reason the
-- isolation policies do: the database is the place a rule cannot be forgotten.
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_price_non_negative" CHECK ("price_minor" >= 0);
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_price_non_negative" CHECK ("unit_price_minor" >= 0);
ALTER TABLE "order_line" ADD CONSTRAINT "order_line_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "bill" ADD CONSTRAINT "bill_totals_non_negative"
  CHECK ("subtotal_minor" >= 0 AND "discount_minor" >= 0 AND "total_minor" >= 0);
ALTER TABLE "payment" ADD CONSTRAINT "payment_amount_positive" CHECK ("amount_minor" > 0);

-- ---------------------------------------------------------------------------
-- Registration — DATA, not schema
--
-- The capability and its entities are rows in the platform's own registries,
-- exactly as Location's install migration writes them. Nothing here modifies a
-- platform table's shape.
-- ---------------------------------------------------------------------------

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.dinein', 'Dine-in', '1.0.0', ARRAY[]::text[],
  ARRAY[
    'verity.dinein.menu_category','verity.dinein.menu_item','verity.dinein.menu_variant',
    'verity.dinein.zone','verity.dinein.table','verity.dinein.order',
    'verity.dinein.order_line','verity.dinein.bill','verity.dinein.payment'
  ],
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.dinein.menu_category', 'verity.capability.dinein', 'Persistent', 'menu_category', true),
  ('verity.dinein.menu_item',     'verity.capability.dinein', 'Persistent', 'menu_item',     true),
  ('verity.dinein.menu_variant',  'verity.capability.dinein', 'Persistent', 'menu_variant',  true),
  ('verity.dinein.zone',          'verity.capability.dinein', 'Persistent', 'dining_zone',   true),
  ('verity.dinein.table',         'verity.capability.dinein', 'Persistent', 'dining_table',  true),
  ('verity.dinein.order',         'verity.capability.dinein', 'Persistent', 'dining_order',  true),
  ('verity.dinein.order_line',    'verity.capability.dinein', 'Persistent', 'order_line',    true),
  ('verity.dinein.bill',          'verity.capability.dinein', 'Persistent', 'bill',          true),
  ('verity.dinein.payment',       'verity.capability.dinein', 'Persistent', 'payment',       true)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- State machines (KentsRestaurant.md §7)
--
-- Categories are declared honestly, which is what makes the SLA substrate work
-- with no clock code in the capability: a queued line is Pending and does not
-- burn the prep budget; preparing is Active and does; ready is Completed and
-- stops it, keeping any breach rather than laundering it.
--
-- Only Completed and Cancelled may be terminal (ADR-009), and INV-002 locks a
-- terminal record permanently.
-- ---------------------------------------------------------------------------

INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal) VALUES
  -- Table: available is where a table starts and returns to.
  (gen_random_uuid(), 'verity.dinein.table', 'available',      'Active',    true,  false),
  (gen_random_uuid(), 'verity.dinein.table', 'occupied',       'Active',    false, false),
  (gen_random_uuid(), 'verity.dinein.table', 'reserved',       'Pending',   false, false),
  (gen_random_uuid(), 'verity.dinein.table', 'cleaning',       'Blocked',   false, false),
  (gen_random_uuid(), 'verity.dinein.table', 'out_of_service', 'Pending',   false, false),
  (gen_random_uuid(), 'verity.dinein.table', 'retired',        'Cancelled', false, true),

  -- Order: `served` is Completed but NOT terminal — ADR-003's decoupling of
  -- execution from administrative closure. The food is delivered; the bill and
  -- the payment still have to happen, and `settled` plays Closed.
  (gen_random_uuid(), 'verity.dinein.order', 'draft',            'Draft',     true,  false),
  (gen_random_uuid(), 'verity.dinein.order', 'placed',           'Active',    false, false),
  (gen_random_uuid(), 'verity.dinein.order', 'partially_served', 'Active',    false, false),
  (gen_random_uuid(), 'verity.dinein.order', 'served',           'Completed', false, false),
  (gen_random_uuid(), 'verity.dinein.order', 'billed',           'Pending',   false, false),
  (gen_random_uuid(), 'verity.dinein.order', 'settled',          'Completed', false, true),
  (gen_random_uuid(), 'verity.dinein.order', 'cancelled',        'Cancelled', false, true),

  -- Line: the kitchen's unit of progress.
  (gen_random_uuid(), 'verity.dinein.order_line', 'queued',    'Pending',   true,  false),
  (gen_random_uuid(), 'verity.dinein.order_line', 'preparing', 'Active',    false, false),
  (gen_random_uuid(), 'verity.dinein.order_line', 'ready',     'Completed', false, false),
  (gen_random_uuid(), 'verity.dinein.order_line', 'served',    'Completed', false, false),
  (gen_random_uuid(), 'verity.dinein.order_line', 'voided',    'Cancelled', false, true),

  -- Bill.
  (gen_random_uuid(), 'verity.dinein.bill', 'open',    'Active',    true,  false),
  (gen_random_uuid(), 'verity.dinein.bill', 'settled', 'Completed', false, true),
  (gen_random_uuid(), 'verity.dinein.bill', 'voided',  'Cancelled', false, true)
ON CONFLICT (entity_key, key) DO NOTHING;

-- Transitions. There are no backwards edges anywhere: a mis-tapped advance is
-- corrected by a manager-held command, not by walking the machine in reverse,
-- because reverse edges make "what happened here" unanswerable.
INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.dinein.table', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.dinein.table' AND t.entity_key = 'verity.dinein.table'
  AND (f.key, t.key) IN (
    ('available','occupied'), ('available','reserved'), ('available','out_of_service'),
    ('available','retired'), ('reserved','occupied'), ('reserved','available'),
    ('occupied','cleaning'), ('cleaning','available'),
    ('out_of_service','available'), ('out_of_service','retired'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.dinein.order', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.dinein.order' AND t.entity_key = 'verity.dinein.order'
  AND (f.key, t.key) IN (
    ('draft','placed'), ('draft','cancelled'),
    ('placed','partially_served'), ('placed','served'), ('placed','cancelled'),
    ('partially_served','served'), ('partially_served','cancelled'),
    ('served','billed'), ('billed','settled'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.dinein.order_line', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.dinein.order_line' AND t.entity_key = 'verity.dinein.order_line'
  AND (f.key, t.key) IN (
    ('queued','preparing'), ('queued','voided'),
    ('preparing','ready'), ('preparing','voided'),
    ('ready','served'), ('ready','voided'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.dinein.bill', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.dinein.bill' AND t.entity_key = 'verity.dinein.bill'
  AND (f.key, t.key) IN (('open','settled'), ('open','voided'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;
