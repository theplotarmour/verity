-- CreateEnum
CREATE TYPE "OfflineCommandStatus" AS ENUM ('Pending', 'Applied', 'Rejected');

-- CreateEnum
CREATE TYPE "SyncConflictKind" AS ENUM ('StateConflict', 'TargetDeleted', 'AuthorizationRevoked', 'VersionConflict');

-- CreateTable
CREATE TABLE "offline_command" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "command_id" UUID NOT NULL,
    "command_key" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "device_timestamp" TIMESTAMP(3) NOT NULL,
    "status" "OfflineCommandStatus" NOT NULL DEFAULT 'Pending',
    "result" JSONB,
    "error" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "offline_command_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_exception" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "offline_command_id" UUID NOT NULL,
    "kind" "SyncConflictKind" NOT NULL,
    "detail" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_exception_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offline_command_tenant_id_status_device_timestamp_idx" ON "offline_command"("tenant_id", "status", "device_timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "offline_command_tenant_id_command_id_key" ON "offline_command"("tenant_id", "command_id");

-- CreateIndex
CREATE INDEX "sync_exception_tenant_id_resolved_at_idx" ON "sync_exception"("tenant_id", "resolved_at");

-- AddForeignKey
ALTER TABLE "offline_command" ADD CONSTRAINT "offline_command_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_exception" ADD CONSTRAINT "sync_exception_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_exception" ADD CONSTRAINT "sync_exception_offline_command_id_fkey" FOREIGN KEY ("offline_command_id") REFERENCES "offline_command"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Sync inbox isolation. Authority: Bible V5 §2, REQ-DATA-SYNC-002.
ALTER TABLE "offline_command" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "offline_command" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sync_exception" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sync_exception" FORCE ROW LEVEL SECURITY;

CREATE POLICY "offline_command_isolation" ON "offline_command"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

CREATE POLICY "sync_exception_isolation" ON "sync_exception"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());
