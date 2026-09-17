-- ---------------------------------------------------------------------------
-- Task 108 WP-11B: versioned document/checklist/form template registry
-- (VCA-009).
-- ---------------------------------------------------------------------------

-- CreateEnum
CREATE TYPE "TemplateKind" AS ENUM ('Form', 'Document', 'Checklist');

-- CreateTable
CREATE TABLE "template_definition" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contribution_id" TEXT NOT NULL,
    "kind" "TemplateKind" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "owner_capability" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_instance" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "entity_key" TEXT,
    "entity_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "data" JSONB NOT NULL DEFAULT '{}',
    "submitted_by_party_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_instance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_definition_tenant_id_contribution_id_version_key" ON "template_definition"("tenant_id", "contribution_id", "version");
CREATE INDEX "template_definition_tenant_id_contribution_id_idx" ON "template_definition"("tenant_id", "contribution_id");

CREATE INDEX "template_instance_tenant_id_definition_id_idx" ON "template_instance"("tenant_id", "definition_id");
CREATE INDEX "template_instance_tenant_id_entity_key_entity_id_idx" ON "template_instance"("tenant_id", "entity_key", "entity_id");

-- AddForeignKey
ALTER TABLE "template_definition" ADD CONSTRAINT "template_definition_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_instance" ADD CONSTRAINT "template_instance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_instance" ADD CONSTRAINT "template_instance_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "template_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row-level security (INV-001)
-- ---------------------------------------------------------------------------

ALTER TABLE "template_definition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "template_definition" FORCE ROW LEVEL SECURITY;
ALTER TABLE "template_instance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "template_instance" FORCE ROW LEVEL SECURITY;

CREATE POLICY "template_definition_isolation" ON "template_definition"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

CREATE POLICY "template_instance_isolation" ON "template_instance"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- template_definition is a version ledger: no UPDATE policy, so a version
-- once written cannot be edited in place — a change must be a new version
-- (WP-11B §"immutable reference to the template version used").
CREATE POLICY "template_definition_insert" ON "template_definition"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "template_definition_select" ON "template_definition"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());

CREATE TRIGGER audit_command_mutation AFTER INSERT OR UPDATE OR DELETE ON "template_instance"
  FOR EACH ROW EXECUTE FUNCTION verity.audit_command_mutation();
