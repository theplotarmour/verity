-- ---------------------------------------------------------------------------
-- Task 108 WP-11A: durable per-tenant capability upgrade lifecycle (VCA-008).
-- ---------------------------------------------------------------------------

-- CreateEnum
CREATE TYPE "CapabilityUpgradeState" AS ENUM ('Planned', 'Preflighted', 'Applying', 'Verifying', 'Completed', 'Failed', 'RolledBack');

-- CreateTable
CREATE TABLE "capability_upgrade_operation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "capability_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'Upgrade',
    "from_version" TEXT,
    "to_version" TEXT NOT NULL,
    "state" "CapabilityUpgradeState" NOT NULL DEFAULT 'Planned',
    "reversible" BOOLEAN NOT NULL DEFAULT false,
    "diff" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "approved_by_user_id" UUID,
    "correlation_id" UUID,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "capability_upgrade_operation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "capability_upgrade_operation_tenant_id_capability_id_start_idx" ON "capability_upgrade_operation"("tenant_id", "capability_id", "started_at");

-- AddForeignKey
ALTER TABLE "capability_upgrade_operation" ADD CONSTRAINT "capability_upgrade_operation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "capability_upgrade_operation" ADD CONSTRAINT "capability_upgrade_operation_capability_id_fkey" FOREIGN KEY ("capability_id") REFERENCES "capability_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row-level security (INV-001)
-- ---------------------------------------------------------------------------

ALTER TABLE "capability_upgrade_operation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "capability_upgrade_operation" FORCE ROW LEVEL SECURITY;

CREATE POLICY "capability_upgrade_operation_isolation" ON "capability_upgrade_operation"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

CREATE TRIGGER audit_command_mutation AFTER INSERT OR UPDATE OR DELETE ON "capability_upgrade_operation"
  FOR EACH ROW EXECUTE FUNCTION verity.audit_command_mutation();

-- ---------------------------------------------------------------------------
-- Half-applied-state guard, same shape as pack_instance's: a Completed
-- operation must record what version it actually landed the tenant on.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.capability_upgrade_requires_completion_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.state IN ('Completed', 'RolledBack') AND NEW.completed_at IS NULL THEN
    RAISE EXCEPTION 'capability upgrade operation % cannot be % with no completed_at', NEW.id, NEW.state
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "capability_upgrade_requires_completion_fields"
  BEFORE INSERT OR UPDATE ON "capability_upgrade_operation"
  FOR EACH ROW EXECUTE FUNCTION verity.capability_upgrade_requires_completion_fields();
