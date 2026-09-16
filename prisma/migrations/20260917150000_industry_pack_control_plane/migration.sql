-- ---------------------------------------------------------------------------
-- Task 108 WP-10: Industry Pack control plane (VCA-007).
--
-- PackRelease is GLOBAL platform metadata, like capability_definition — the
-- signed artifact's identity is a platform fact written once when the release
-- is imported. PackInstance/PackOperation/PackContribution/PackEvent are
-- tenant-scoped, like tenant_activation.
-- ---------------------------------------------------------------------------

-- CreateEnum
CREATE TYPE "PackInstanceState" AS ENUM ('Absent', 'Applying', 'Active', 'Suspended', 'Failed', 'RollbackRequired');

-- CreateEnum
CREATE TYPE "PackOperationKind" AS ENUM ('Preview', 'Apply', 'Reapply', 'Upgrade', 'Rollback', 'Remove');

-- CreateEnum
CREATE TYPE "PackOperationState" AS ENUM ('Planned', 'Preflighted', 'Applying', 'Verifying', 'Completed', 'Failed', 'RolledBack');

-- CreateTable
CREATE TABLE "pack_release" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "publisher" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "platform_range" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pack_release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_instance" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pack_key" TEXT NOT NULL,
    "desired_release_id" UUID,
    "applied_release_id" UUID,
    "state" "PackInstanceState" NOT NULL DEFAULT 'Absent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pack_instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_operation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "kind" "PackOperationKind" NOT NULL,
    "state" "PackOperationState" NOT NULL DEFAULT 'Planned',
    "plan_hash" TEXT NOT NULL,
    "diff" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "approved_by_user_id" UUID,
    "correlation_id" UUID,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "pack_operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_contribution" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "contribution_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "owner_capability" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pack_contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_event" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "operation_id" UUID,
    "event_type" TEXT NOT NULL,
    "actor_user_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "correlation_id" UUID,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pack_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pack_release_digest_key" ON "pack_release"("digest");
CREATE UNIQUE INDEX "pack_release_key_version_key" ON "pack_release"("key", "version");
CREATE INDEX "pack_release_key_idx" ON "pack_release"("key");

CREATE UNIQUE INDEX "pack_instance_tenant_id_pack_key_key" ON "pack_instance"("tenant_id", "pack_key");
CREATE INDEX "pack_instance_tenant_id_idx" ON "pack_instance"("tenant_id");

CREATE INDEX "pack_operation_tenant_id_instance_id_idx" ON "pack_operation"("tenant_id", "instance_id");

CREATE UNIQUE INDEX "pack_contribution_tenant_id_contribution_id_key" ON "pack_contribution"("tenant_id", "contribution_id");
CREATE INDEX "pack_contribution_tenant_id_instance_id_idx" ON "pack_contribution"("tenant_id", "instance_id");

CREATE INDEX "pack_event_tenant_id_instance_id_occurred_at_idx" ON "pack_event"("tenant_id", "instance_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "pack_instance" ADD CONSTRAINT "pack_instance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pack_instance" ADD CONSTRAINT "pack_instance_desired_release_id_fkey" FOREIGN KEY ("desired_release_id") REFERENCES "pack_release"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pack_instance" ADD CONSTRAINT "pack_instance_applied_release_id_fkey" FOREIGN KEY ("applied_release_id") REFERENCES "pack_release"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pack_operation" ADD CONSTRAINT "pack_operation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pack_operation" ADD CONSTRAINT "pack_operation_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "pack_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pack_operation" ADD CONSTRAINT "pack_operation_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "pack_release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pack_contribution" ADD CONSTRAINT "pack_contribution_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pack_contribution" ADD CONSTRAINT "pack_contribution_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "pack_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pack_event" ADD CONSTRAINT "pack_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pack_event" ADD CONSTRAINT "pack_event_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "pack_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row-level security (INV-001)
-- ---------------------------------------------------------------------------

ALTER TABLE "pack_release" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pack_release" FORCE ROW LEVEL SECURITY;
ALTER TABLE "pack_instance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pack_instance" FORCE ROW LEVEL SECURITY;
ALTER TABLE "pack_operation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pack_operation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "pack_contribution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pack_contribution" FORCE ROW LEVEL SECURITY;
ALTER TABLE "pack_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pack_event" FORCE ROW LEVEL SECURITY;

-- Releases are global platform metadata: readable inside any tenant context,
-- writable only by the migration/import tool (WP-10 §Security requirements —
-- "signature and digest validated before preview and again before apply").
CREATE POLICY "pack_release_read" ON "pack_release"
  FOR SELECT USING (verity.current_tenant_id() IS NOT NULL);

CREATE POLICY "pack_instance_isolation" ON "pack_instance"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

CREATE POLICY "pack_operation_isolation" ON "pack_operation"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

CREATE POLICY "pack_contribution_isolation" ON "pack_contribution"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- pack_event is append-only history (WP-10 §Data model concepts): only insert
-- and select policies are defined, so update/delete are denied by RLS default-deny.
CREATE POLICY "pack_event_insert" ON "pack_event"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "pack_event_select" ON "pack_event"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());

CREATE TRIGGER audit_command_mutation AFTER INSERT OR UPDATE OR DELETE ON "pack_instance"
  FOR EACH ROW EXECUTE FUNCTION verity.audit_command_mutation();
CREATE TRIGGER audit_command_mutation AFTER INSERT OR UPDATE OR DELETE ON "pack_operation"
  FOR EACH ROW EXECUTE FUNCTION verity.audit_command_mutation();

-- ---------------------------------------------------------------------------
-- Half-applied-state guard (WP-10 §Lifecycle)
--
-- A pack cannot be reported Active with no applied release. The service layer
-- enforces the full state-transition ordering; this trigger only refuses the
-- physically impossible combination so a bug or a direct write cannot produce
-- a false "active" pack.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.pack_instance_requires_applied_release()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.state = 'Active' AND NEW.applied_release_id IS NULL THEN
    RAISE EXCEPTION 'pack instance % cannot be Active with no applied release', NEW.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "pack_instance_requires_applied_release"
  BEFORE INSERT OR UPDATE ON "pack_instance"
  FOR EACH ROW EXECUTE FUNCTION verity.pack_instance_requires_applied_release();
