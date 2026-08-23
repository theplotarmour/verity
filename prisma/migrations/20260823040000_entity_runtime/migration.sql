-- CreateEnum
CREATE TYPE "EntityClass" AS ENUM ('Persistent', 'Transient', 'Abstract');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('String', 'Number', 'Boolean', 'Select', 'Date');

-- CreateTable
CREATE TABLE "entity_definition" (
    "key" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "class" "EntityClass" NOT NULL,
    "table_name" TEXT,
    "tenant_scoped" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_definition_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "custom_field_schema" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_key" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_type" "CustomFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "select_options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_schema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entity_definition_capability_idx" ON "entity_definition"("capability");

-- CreateIndex
CREATE INDEX "custom_field_schema_tenant_id_entity_key_idx" ON "custom_field_schema"("tenant_id", "entity_key");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_schema_tenant_id_entity_key_field_name_key" ON "custom_field_schema"("tenant_id", "entity_key", "field_name");

-- AddForeignKey
ALTER TABLE "custom_field_schema" ADD CONSTRAINT "custom_field_schema_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_schema" ADD CONSTRAINT "custom_field_schema_entity_key_fkey" FOREIGN KEY ("entity_key") REFERENCES "entity_definition"("key") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Entity runtime isolation
--
-- `entity_definition` is GLOBAL platform metadata: it describes types, is
-- identical for every tenant, and is written by migrations when a capability is
-- installed. PLA-TEN-001 exempts exactly this kind of global system reference
-- from tenant partitioning. It is readable by any tenant context and writable by
-- none — there is no INSERT/UPDATE/DELETE policy, so the application role cannot
-- mutate the registry even though it can read it. Capability installation runs
-- as the migration role.
--
-- `custom_field_schema` is one tenant's extension of an entity and is
-- tenant-scoped in the ordinary way.
-- ---------------------------------------------------------------------------

ALTER TABLE "entity_definition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "entity_definition" FORCE ROW LEVEL SECURITY;
ALTER TABLE "custom_field_schema" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_field_schema" FORCE ROW LEVEL SECURITY;

-- Readable only from within a tenant context, so an unscoped connection still
-- sees nothing; but the rows themselves are not tenant-specific.
CREATE POLICY "entity_definition_read" ON "entity_definition"
  FOR SELECT USING (verity.current_tenant_id() IS NOT NULL);

CREATE POLICY "custom_field_schema_isolation" ON "custom_field_schema"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());
