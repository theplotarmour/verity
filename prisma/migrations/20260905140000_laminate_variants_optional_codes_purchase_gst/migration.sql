-- ===========================================================================
-- Four changes the plywood client asked for, in one migration because three of
-- them touch the same two tables.
--
--   1. HSN code optional on every product.
--   2. Grade optional (a decorative laminate has none).
--   3. Laminate shade + texture, and the variant matrix they generate.
--   4. A per-purchase-order GST switch, on by default.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. HSN optional.
--
--    The shape CHECK stays -- a code that IS given must still be 4, 6 or 8
--    digits -- but it now admits NULL. Dropping and recreating by name is
--    required: a hand-written CHECK is invisible to Prisma's differ, so it
--    would otherwise survive the column change and reject every NULL.
--
--    The constraint still carries its pre-ADR-018 name on the renamed table.
--    Renaming it here would be churn for its own sake; it is dropped and
--    recreated under the name the table actually wears now.
-- ---------------------------------------------------------------------------

ALTER TABLE "trading_product" ALTER COLUMN "hsn_code" DROP NOT NULL;
ALTER TABLE "trading_product" DROP CONSTRAINT IF EXISTS "plywood_product_hsn_code_shape";
ALTER TABLE "trading_product" DROP CONSTRAINT IF EXISTS "trading_product_hsn_code_shape";
ALTER TABLE "trading_product" ADD CONSTRAINT "trading_product_hsn_code_shape"
  CHECK ("hsn_code" IS NULL OR "hsn_code" ~ '^[0-9]{4}([0-9]{2}([0-9]{2})?)?$');

-- ---------------------------------------------------------------------------
-- 2. Grade optional.
--
--    Nothing is backfilled and nothing is cleared: every existing row holds a
--    grade somebody typed, and a grade typed under duress is still what they
--    said. Only new laminates may leave it empty.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_product_detail" ALTER COLUMN "grade" DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Shade and texture, and the template/variant link.
--
--    `parent_product_id` is a self-reference on the tenant-scoped key, so a
--    variant can never point at a template in another tenant (INV-001: no
--    cross-tenant foreign keys, and this one cannot become one by accident
--    because the tenant column is half of the reference).
--
--    ON DELETE RESTRICT on both taxonomies: a shade with products on it is not
--    deletable, because deleting it would either orphan or silently rewrite
--    twenty-five catalogue rows. Deactivate it instead -- `active` is there
--    precisely so a discontinued shade stops being offered without touching
--    the history of what was sold.
-- ---------------------------------------------------------------------------

CREATE TABLE "plywood_shade" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"  UUID NOT NULL,
    "name"       TEXT NOT NULL,
    "active"     BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "plywood_shade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_texture" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"  UUID NOT NULL,
    "name"       TEXT NOT NULL,
    "active"     BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "plywood_texture_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "plywood_shade" ADD CONSTRAINT "plywood_shade_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_texture" ADD CONSTRAINT "plywood_texture_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "plywood_shade_tenant_id_id_key"     ON "plywood_shade"("tenant_id", "id");
CREATE UNIQUE INDEX "plywood_texture_tenant_id_id_key"   ON "plywood_texture"("tenant_id", "id");
CREATE UNIQUE INDEX "plywood_shade_tenant_id_name_key"   ON "plywood_shade"("tenant_id", "name");
CREATE UNIQUE INDEX "plywood_texture_tenant_id_name_key" ON "plywood_texture"("tenant_id", "name");

ALTER TABLE "plywood_shade"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_shade"   FORCE  ROW LEVEL SECURITY;
ALTER TABLE "plywood_texture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_texture" FORCE  ROW LEVEL SECURITY;
CREATE POLICY "plywood_shade_isolation" ON "plywood_shade"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_texture_isolation" ON "plywood_texture"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "plywood_product_detail"
  ADD COLUMN "shade_id"   UUID,
  ADD COLUMN "texture_id" UUID;

ALTER TABLE "plywood_product_detail" ADD CONSTRAINT "plywood_product_detail_shade_fkey"
  FOREIGN KEY ("tenant_id", "shade_id") REFERENCES "plywood_shade"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_product_detail" ADD CONSTRAINT "plywood_product_detail_texture_fkey"
  FOREIGN KEY ("tenant_id", "texture_id") REFERENCES "plywood_texture"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE INDEX "plywood_product_detail_tenant_id_shade_id_idx"   ON "plywood_product_detail"("tenant_id", "shade_id");
CREATE INDEX "plywood_product_detail_tenant_id_texture_id_idx" ON "plywood_product_detail"("tenant_id", "texture_id");

ALTER TABLE "trading_product" ADD COLUMN "parent_product_id" UUID;
ALTER TABLE "trading_product" ADD CONSTRAINT "trading_product_parent_fkey"
  FOREIGN KEY ("tenant_id", "parent_product_id") REFERENCES "trading_product"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX "trading_product_tenant_id_parent_product_id_idx"
  ON "trading_product"("tenant_id", "parent_product_id");

-- A template is not a thing in the godown. It holds what its variants share
-- and is never stocked, ordered or invoiced, so it must never be its own
-- parent and a variant must never be a template.
ALTER TABLE "trading_product" ADD CONSTRAINT "trading_product_parent_is_not_self"
  CHECK ("parent_product_id" IS NULL OR "parent_product_id" <> "id");
ALTER TABLE "trading_product" ADD CONSTRAINT "trading_product_template_has_no_parent"
  CHECK ("type" <> 'TEMPLATE' OR "parent_product_id" IS NULL);

-- ---------------------------------------------------------------------------
-- 4. Per-order GST switch.
--
--    DEFAULT true, and every existing order is backfilled true by that
--    default. That is the honest value: every purchase recorded before this
--    column existed was invoiced with tax, and marking them otherwise would
--    rewrite what happened.
-- ---------------------------------------------------------------------------

ALTER TABLE "trading_purchase_order"
  ADD COLUMN "gst_applicable" BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 5. The HSN snapshots on order and invoice lines follow the product.
--
--    Each line copies the product's HSN at the moment it is written -- the
--    snapshot is what makes an old invoice still true after the catalogue
--    changes. Now that a product may have no HSN, the snapshot of "what it was
--    then" is legitimately nothing, and a NOT NULL here would push the
--    optionality straight back onto the catalogue.
--
--    `taxSummary` and `closeChecklist` already branch on a missing snapshot
--    (they group it as UNKNOWN and list the invoice for attention), so nothing
--    downstream starts guessing.
-- ---------------------------------------------------------------------------

ALTER TABLE "trading_purchase_order_line" ALTER COLUMN "hsn_code_snapshot" DROP NOT NULL;
ALTER TABLE "trading_sales_order_line"    ALTER COLUMN "hsn_code_snapshot" DROP NOT NULL;
ALTER TABLE "trading_invoice_line"        ALTER COLUMN "hsn_code_snapshot" DROP NOT NULL;
