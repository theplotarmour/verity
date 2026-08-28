-- ---------------------------------------------------------------------------
-- CAPABILITY: Plywood trading -- install, stage 1 (catalogue and floor)
--
-- The second real client requirement: a plywood, laminate, MDF and board
-- trading business. Requirement source: plywood.md. Gap analysis and build
-- sequence: implementation/plywood-gap-analysis.md.
--
-- This is a CAPABILITY install, not a platform change. Nothing here alters
-- tenancy, authorization, the command runtime, the event runtime or the shell.
-- The expected `git diff --stat src/server/platform/` for this stage is empty.
--
-- Stage 1 is deliberately the only stage that begins before the six open
-- decisions (P1..P6) are answered, because it is gated by none of them. Stock
-- movements, costing, reservations, invoicing and tax all wait.
--
-- Structure follows the dine-in exemplar: tables, ENABLE + FORCE RLS,
-- isolation policies, check constraints, then registry rows.
-- ---------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "plywood_brand" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plywood_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plywood_product" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "hsn_code" TEXT NOT NULL,
    "thickness_tenth_mm" INTEGER NOT NULL,
    "width_mm" INTEGER NOT NULL,
    "height_mm" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "sheet_weight_grams" INTEGER,
    "reorder_level_units" INTEGER NOT NULL DEFAULT 0,
    "unit_label" TEXT NOT NULL DEFAULT 'sheets',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plywood_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "godown_rack" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "rack_label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "godown_rack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plywood_brand_tenant_id_name_key" ON "plywood_brand"("tenant_id", "name");
CREATE UNIQUE INDEX "plywood_brand_tenant_id_id_key" ON "plywood_brand"("tenant_id", "id");
CREATE UNIQUE INDEX "plywood_product_tenant_id_id_key" ON "plywood_product"("tenant_id", "id");
CREATE INDEX "plywood_product_tenant_id_brand_id_name_idx" ON "plywood_product"("tenant_id", "brand_id", "name");
CREATE INDEX "plywood_product_tenant_id_active_idx" ON "plywood_product"("tenant_id", "active");
CREATE UNIQUE INDEX "godown_rack_tenant_id_location_id_rack_label_key" ON "godown_rack"("tenant_id", "location_id", "rack_label");
CREATE UNIQUE INDEX "godown_rack_tenant_id_id_key" ON "godown_rack"("tenant_id", "id");
CREATE INDEX "godown_rack_tenant_id_location_id_idx" ON "godown_rack"("tenant_id", "location_id");

-- AddForeignKey
ALTER TABLE "plywood_brand" ADD CONSTRAINT "plywood_brand_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Composite, so a product can never reference a brand belonging to another
-- tenant. The same shape every capability table uses (INV-001): a plain
-- single-column reference would be satisfiable across the boundary.
ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_tenant_id_brand_id_fkey"
  FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "plywood_brand"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "godown_rack" ADD CONSTRAINT "godown_rack_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "godown_rack" ADD CONSTRAINT "godown_rack_tenant_id_location_id_fkey"
  FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Tenant isolation (INV-001)
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_brand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_brand" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_product" FORCE ROW LEVEL SECURITY;
ALTER TABLE "godown_rack" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "godown_rack" FORCE ROW LEVEL SECURITY;

CREATE POLICY "plywood_brand_isolation" ON "plywood_brand"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_product_isolation" ON "plywood_product"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "godown_rack_isolation" ON "godown_rack"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- Physical facts the application must not be trusted to remember
--
-- A board with a zero or negative dimension is not a board. These belong in the
-- database for the same reason the isolation policies do: a rule enforced only
-- in application code is enforced until someone writes a second writer.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_dimensions_positive"
  CHECK ("thickness_tenth_mm" > 0 AND "width_mm" > 0 AND "height_mm" > 0);
ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_weight_positive"
  CHECK ("sheet_weight_grams" IS NULL OR "sheet_weight_grams" > 0);
ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_reorder_level_non_negative"
  CHECK ("reorder_level_units" >= 0);
-- CBIC notification 78/2020 sets 4, 6 or 8 digits by turnover. The rule is the
-- shape, not which of the three: the client's accountant chooses the digit
-- count, and a system that hard-coded one would be wrong for the other two.
ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_hsn_code_shape"
  CHECK ("hsn_code" ~ '^[0-9]{4}([0-9]{2}([0-9]{2})?)?$');

-- ---------------------------------------------------------------------------
-- Registration -- DATA, not schema
-- ---------------------------------------------------------------------------

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.plywood', 'Plywood trading', '0.1.0',
  -- Godowns are Locations, so the dependency is real and declared rather than
  -- discovered at runtime by a failing foreign key.
  ARRAY['verity.capability.location']::text[],
  ARRAY[
    'verity.plywood.brand','verity.plywood.product','verity.plywood.godown_rack'
  ],
  now()
) ON CONFLICT (id) DO UPDATE
  SET version = EXCLUDED.version,
      dependencies = EXCLUDED.dependencies,
      entity_types = EXCLUDED.entity_types,
      updated_at = now();

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.plywood.brand',       'verity.capability.plywood', 'Persistent', 'plywood_brand',   true),
  ('verity.plywood.product',     'verity.capability.plywood', 'Persistent', 'plywood_product', true),
  ('verity.plywood.godown_rack', 'verity.capability.plywood', 'Persistent', 'godown_rack',     true)
ON CONFLICT (key) DO NOTHING;
