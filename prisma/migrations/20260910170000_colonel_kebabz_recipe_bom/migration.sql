-- ---------------------------------------------------------------------------
-- Colonel Kebabz Phase 1: Recipe/BOM (PRD §14-16), decision 2026-09-10
-- ---------------------------------------------------------------------------
-- This file is hand-composed from an isolated `prisma migrate diff`, not the
-- raw auto-generated output: the live database also carries pre-existing,
-- unrelated drift from `20260904180000_trading_capability_extraction`
-- (plywood_* -> trading_* constraint renames, index changes) that a full
-- `migrate dev` diff would have bundled in here. That drift is untouched by
-- this migration and is tracked separately, not silently swept in.

-- AlterTable: InventoryItem.avgUnitCostPaise — decision 2026-09-10, inventory
-- owns quantity AND cost for ingredients (see prisma/schema.prisma's own
-- comment on this field).
ALTER TABLE "inventory_item" ADD COLUMN "avg_unit_cost_paise" INTEGER;

-- AlterTable: InventoryStockMovement.unitCostPaise
ALTER TABLE "inventory_stock_movement" ADD COLUMN "unit_cost_paise" INTEGER;

-- CreateTable
CREATE TABLE "recipe" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "yield_qty" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredient" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "unit_label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "recipe_ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipe_tenant_id_menu_item_id_key" ON "recipe"("tenant_id", "menu_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_tenant_id_id_key" ON "recipe"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredient_tenant_id_recipe_id_inventory_item_id_key" ON "recipe_ingredient"("tenant_id", "recipe_id", "inventory_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredient_tenant_id_id_key" ON "recipe_ingredient"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_tenant_id_menu_item_id_fkey" FOREIGN KEY ("tenant_id", "menu_item_id") REFERENCES "menu_item"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_tenant_id_recipe_id_fkey" FOREIGN KEY ("tenant_id", "recipe_id") REFERENCES "recipe"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_tenant_id_inventory_item_id_fkey" FOREIGN KEY ("tenant_id", "inventory_item_id") REFERENCES "inventory_item"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: Recipe (Colonel Kebabz Phase 1)
-- ---------------------------------------------------------------------------

ALTER TABLE "recipe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipe" FORCE ROW LEVEL SECURITY;
CREATE POLICY "recipe_isolation" ON "recipe"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "recipe_ingredient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipe_ingredient" FORCE ROW LEVEL SECURITY;
CREATE POLICY "recipe_ingredient_isolation" ON "recipe_ingredient"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.recipe', 'Recipe', '1.0.0',
  ARRAY['verity.capability.dinein', 'verity.capability.inventory'],
  ARRAY['verity.recipe.recipe'],
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped)
VALUES ('verity.recipe.recipe', 'verity.capability.recipe', 'Persistent', 'recipe', true)
ON CONFLICT (key) DO NOTHING;
