-- Domain blueprints let non-inventory master records use the same SpecField
-- engine as inventory groups while storing rows in their existing tables.
ALTER TABLE "ItemGroup" ADD COLUMN "domainType" TEXT;

ALTER TABLE "Supplier" ADD COLUMN "customFields" JSONB DEFAULT '{}';
ALTER TABLE "Warehouse" ADD COLUMN "customFields" JSONB DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN "customFields" JSONB DEFAULT '{}';

CREATE INDEX "ItemGroup_factoryId_domainType_idx" ON "ItemGroup"("factoryId", "domainType");
