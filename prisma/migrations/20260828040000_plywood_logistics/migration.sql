-- ---------------------------------------------------------------------------
-- CAPABILITY: Plywood trading -- stage 5, logistics
--
-- Requirement source: plywood.md §1.6. Answers the owner's two questions:
-- where is my material right now, and what has been sent to which customer and
-- was it delivered.
--
-- P6 resolved to records rather than users: no transporter signs in.
--
-- LR scans and signed delivery receipts are `Evidence` rows pointing at a
-- shipment. Evidence already references any capability's entity by key and id,
-- so no column here holds a document -- which is simpler than the two evidence
-- foreign keys plywood.md proposed, and is the reuse it predicted.
--
-- Capability install. `git diff --stat src/server/platform/`: empty.
-- ---------------------------------------------------------------------------

CREATE TABLE "plywood_transporter" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plywood_transporter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_shipment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "transporter_id" UUID,
    "vehicle_asset_id" UUID,
    "lr_number" TEXT,
    "source_location_id" UUID NOT NULL,
    "dest_location_id" UUID,
    "dest_customer_id" UUID,
    "sales_order_id" UUID,
    "purchase_order_id" UUID,
    "freight_charge_paise" INTEGER NOT NULL DEFAULT 0,
    "freight_payer" TEXT NOT NULL DEFAULT 'tenant',
    "state" TEXT NOT NULL DEFAULT 'draft',
    "dispatched_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plywood_shipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plywood_transporter_tenant_id_id_key" ON "plywood_transporter"("tenant_id", "id");
CREATE INDEX "plywood_transporter_tenant_id_name_idx" ON "plywood_transporter"("tenant_id", "name");
CREATE UNIQUE INDEX "plywood_shipment_tenant_id_id_key" ON "plywood_shipment"("tenant_id", "id");
CREATE INDEX "plywood_shipment_tenant_id_state_idx" ON "plywood_shipment"("tenant_id", "state");
-- The owner searches by LR number when a customer phones. It is the handle the
-- transporter answers to, so it gets an index rather than a scan.
CREATE INDEX "plywood_shipment_tenant_id_lr_number_idx" ON "plywood_shipment"("tenant_id", "lr_number");

ALTER TABLE "plywood_transporter" ADD CONSTRAINT "plywood_transporter_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_transporter_fkey"
  FOREIGN KEY ("tenant_id", "transporter_id") REFERENCES "plywood_transporter"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_vehicle_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_asset_id") REFERENCES "asset"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_source_fkey"
  FOREIGN KEY ("tenant_id", "source_location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_dest_location_fkey"
  FOREIGN KEY ("tenant_id", "dest_location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_dest_customer_fkey"
  FOREIGN KEY ("tenant_id", "dest_customer_id") REFERENCES "plywood_customer"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_sales_order_fkey"
  FOREIGN KEY ("tenant_id", "sales_order_id") REFERENCES "plywood_sales_order"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_purchase_order_fkey"
  FOREIGN KEY ("tenant_id", "purchase_order_id") REFERENCES "plywood_purchase_order"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Tenant isolation (INV-001)
ALTER TABLE "plywood_transporter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_transporter" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_shipment" FORCE ROW LEVEL SECURITY;

CREATE POLICY "plywood_transporter_isolation" ON "plywood_transporter"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_shipment_isolation" ON "plywood_shipment"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- Facts the application must not be trusted to remember
-- ---------------------------------------------------------------------------

-- Exactly one order. A polymorphic key and id pair would carry no foreign key,
-- so nothing would stop a shipment pointing at an order that no longer exists.
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_exactly_one_order"
  CHECK (("sales_order_id" IS NULL) <> ("purchase_order_id" IS NULL));

-- Exactly one destination: another godown, or a customer. A shipment going to
-- both, or to neither, is not a shipment.
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_exactly_one_destination"
  CHECK (("dest_location_id" IS NULL) <> ("dest_customer_id" IS NULL));

ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_freight_non_negative"
  CHECK ("freight_charge_paise" >= 0);
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_freight_payer"
  CHECK ("freight_payer" IN ('tenant', 'customer', 'supplier'));

-- Timestamps in the order the events happen. A delivery recorded before its own
-- dispatch is the kind of data that makes a transit-time report meaningless.
ALTER TABLE "plywood_shipment" ADD CONSTRAINT "plywood_shipment_timestamps_ordered"
  CHECK ("delivered_at" IS NULL OR ("dispatched_at" IS NOT NULL AND "delivered_at" >= "dispatched_at"));

-- ---------------------------------------------------------------------------
-- Registration -- DATA, not schema
-- ---------------------------------------------------------------------------

UPDATE "capability_definition"
   SET version = '0.5.0',
       dependencies = ARRAY[
         'verity.capability.location',
         -- Vehicles are Assets and documents are Evidence. Declared, so the
         -- database refuses the activation when either is inactive rather than
         -- discovering it at the first failing foreign key.
         'verity.capability.asset',
         'verity.capability.evidence'
       ]::text[],
       entity_types = ARRAY[
         'verity.plywood.brand','verity.plywood.product','verity.plywood.godown_rack',
         'verity.plywood.stock_ledger','verity.plywood.stock_balance',
         'verity.plywood.supplier','verity.plywood.supplier_price',
         'verity.plywood.customer','verity.plywood.customer_price',
         'verity.plywood.purchase_order','verity.plywood.purchase_order_line',
         'verity.plywood.sales_order','verity.plywood.sales_order_line',
         'verity.plywood.reservation',
         'verity.plywood.transporter','verity.plywood.shipment'
       ],
       updated_at = now()
 WHERE id = 'verity.capability.plywood';

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.plywood.transporter', 'verity.capability.plywood', 'Persistent', 'plywood_transporter', true),
  ('verity.plywood.shipment',    'verity.capability.plywood', 'Persistent', 'plywood_shipment',    true)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- State machine (plywood.md §7.3)
--
-- `in_transit` is Active: the SLA substrate can time a delivery with no clock
-- code here, purely because the category is declared honestly. `assigned` is
-- Pending — the goods are allocated to a carrier but have not moved.
-- ---------------------------------------------------------------------------

INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal) VALUES
  (gen_random_uuid(), 'verity.plywood.shipment', 'draft',      'Draft',     true,  false),
  (gen_random_uuid(), 'verity.plywood.shipment', 'assigned',   'Pending',   false, false),
  (gen_random_uuid(), 'verity.plywood.shipment', 'in_transit', 'Active',    false, false),
  (gen_random_uuid(), 'verity.plywood.shipment', 'delivered',  'Completed', false, true),
  (gen_random_uuid(), 'verity.plywood.shipment', 'cancelled',  'Cancelled', false, true)
ON CONFLICT (entity_key, key) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.plywood.shipment', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.plywood.shipment' AND t.entity_key = 'verity.plywood.shipment'
  AND (f.key, t.key) IN (
    ('draft','assigned'), ('draft','cancelled'),
    ('assigned','in_transit'), ('assigned','cancelled'),
    -- Lost or destroyed in transit. Cancelled rather than delivered, and the
    -- reason is recorded: goods that never arrived are not a delivery.
    ('in_transit','delivered'), ('in_transit','cancelled'))
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;
