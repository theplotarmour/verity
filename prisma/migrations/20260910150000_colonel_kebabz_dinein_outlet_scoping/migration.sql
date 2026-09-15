-- Colonel Kebabz multi-outlet: scope dinein floor/orders/bills to a Location.
--
-- Verified via a live count against this database before writing this
-- migration: dining_zone has zero rows tenant-wide, so every table touched
-- here is empty and adding a NOT NULL column needs no backfill.

-- dining_zone -----------------------------------------------------------
ALTER TABLE "dining_zone" ADD COLUMN "location_id" UUID NOT NULL;
DROP INDEX "dining_zone_tenant_id_name_key";
CREATE UNIQUE INDEX "dining_zone_tenant_id_location_id_name_key" ON "dining_zone"("tenant_id", "location_id", "name");
CREATE INDEX "dining_zone_tenant_id_location_id_idx" ON "dining_zone"("tenant_id", "location_id");
ALTER TABLE "dining_zone" ADD CONSTRAINT "dining_zone_location_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- dining_table ------------------------------------------------------------
ALTER TABLE "dining_table" ADD COLUMN "location_id" UUID NOT NULL;
DROP INDEX "dining_table_tenant_id_label_key";
CREATE UNIQUE INDEX "dining_table_tenant_id_location_id_label_key" ON "dining_table"("tenant_id", "location_id", "label");
CREATE INDEX "dining_table_tenant_id_location_id_idx" ON "dining_table"("tenant_id", "location_id");
ALTER TABLE "dining_table" ADD CONSTRAINT "dining_table_location_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- dining_order ------------------------------------------------------------
ALTER TABLE "dining_order" ADD COLUMN "location_id" UUID NOT NULL;
CREATE INDEX "dining_order_tenant_id_location_id_idx" ON "dining_order"("tenant_id", "location_id");
ALTER TABLE "dining_order" ADD CONSTRAINT "dining_order_location_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- bill ----------------------------------------------------------------------
ALTER TABLE "bill" ADD COLUMN "location_id" UUID NOT NULL;
CREATE INDEX "bill_tenant_id_location_id_idx" ON "bill"("tenant_id", "location_id");
ALTER TABLE "bill" ADD CONSTRAINT "bill_location_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
