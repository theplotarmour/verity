-- Task 118 minimal slice: ManufacturingOrder + ManufacturingOrderLine.
-- Composes Location + InventoryItem + the existing inventory stock ledger —
-- see prisma/schema.prisma's own comment on this capability for what is
-- deliberately NOT built yet (lot/serial, work centers, cost roll-up, QC
-- evidence wiring, recipe generalization).

-- CreateTable
CREATE TABLE "manufacturing_order" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "output_item_id" UUID NOT NULL,
    "output_qty" INTEGER NOT NULL,
    "reference" TEXT,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "manufacturing_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturing_order_line" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "manufacturing_order_id" UUID NOT NULL,
    "component_item_id" UUID NOT NULL,
    "qty_required" INTEGER NOT NULL,

    CONSTRAINT "manufacturing_order_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manufacturing_order_tenant_id_state_idx" ON "manufacturing_order"("tenant_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturing_order_line_manufacturing_order_id_component__key" ON "manufacturing_order_line"("manufacturing_order_id", "component_item_id");

-- AddForeignKey
ALTER TABLE "manufacturing_order" ADD CONSTRAINT "manufacturing_order_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_order" ADD CONSTRAINT "manufacturing_order_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "manufacturing_order" ADD CONSTRAINT "manufacturing_order_output_item_id_fkey" FOREIGN KEY ("output_item_id") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_order_line" ADD CONSTRAINT "manufacturing_order_line_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_order_line" ADD CONSTRAINT "manufacturing_order_line_manufacturing_order_id_fkey" FOREIGN KEY ("manufacturing_order_id") REFERENCES "manufacturing_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturing_order_line" ADD CONSTRAINT "manufacturing_order_line_component_item_id_fkey" FOREIGN KEY ("component_item_id") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Row-level security: tenant isolation (INV-001). Both tables are ordinary
-- mutable records for this slice — ManufacturingOrder's state carries the
-- lifecycle fact, not an append-only ledger, so no reject_mutation trigger
-- (the actual ledger facts land in inventory_stock_movement, unchanged).
ALTER TABLE "manufacturing_order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "manufacturing_order" FORCE ROW LEVEL SECURITY;
CREATE POLICY "manufacturing_order_isolation" ON "manufacturing_order"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "manufacturing_order_line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "manufacturing_order_line" FORCE ROW LEVEL SECURITY;
CREATE POLICY "manufacturing_order_line_isolation" ON "manufacturing_order_line"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Capability + entity + state/transition registration (ADR-009 categories).
INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at) VALUES
  ('verity.capability.manufacturing', 'Manufacturing', '1.0.0',
   ARRAY['verity.capability.location', 'verity.capability.inventory'], ARRAY['verity.manufacturing.order'], now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.manufacturing.order', 'verity.capability.manufacturing', 'Persistent', 'manufacturing_order', true)
ON CONFLICT (key) DO NOTHING;

-- draft: Draft, initial. in_progress: Active (components consumed, output not
-- yet posted). completed: Completed, terminal (INV-002 read-only after this).
-- cancelled: Cancelled, terminal.
INSERT INTO "state_definition" (id, entity_key, key, category, is_initial, is_terminal) VALUES
  (gen_random_uuid(), 'verity.manufacturing.order', 'draft',       'Draft',     true,  false),
  (gen_random_uuid(), 'verity.manufacturing.order', 'in_progress', 'Active',    false, false),
  (gen_random_uuid(), 'verity.manufacturing.order', 'completed',   'Completed', false, true),
  (gen_random_uuid(), 'verity.manufacturing.order', 'cancelled',   'Cancelled', false, true)
ON CONFLICT (entity_key, key) DO NOTHING;

INSERT INTO "transition_definition" (id, entity_key, from_state_id, to_state_id)
SELECT gen_random_uuid(), 'verity.manufacturing.order', f.id, t.id
FROM state_definition f, state_definition t
WHERE f.entity_key = 'verity.manufacturing.order' AND t.entity_key = 'verity.manufacturing.order'
  AND (f.key, t.key) IN (
    ('draft','in_progress'), ('draft','cancelled'),
    ('in_progress','completed'), ('in_progress','cancelled')
  )
ON CONFLICT (from_state_id, to_state_id) DO NOTHING;
