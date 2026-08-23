-- CreateEnum
CREATE TYPE "StoredFileStatus" AS ENUM ('Pending', 'Stored', 'Quarantined');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('InApp', 'Email', 'Push', 'Webhook');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('Pending', 'Sent', 'Failed', 'Suppressed');

-- CreateTable
CREATE TABLE "stored_file" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "checksum" TEXT,
    "status" "StoredFileStatus" NOT NULL DEFAULT 'Pending',
    "uploaded_by_id" UUID,
    "entity_key" TEXT,
    "entity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "stored_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_template" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "notification_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preference" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL DEFAULT '*',
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'Pending',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entity_key" TEXT,
    "entity_id" UUID,
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "failure" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stored_file_tenant_id_entity_key_entity_id_idx" ON "stored_file"("tenant_id", "entity_key", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "stored_file_tenant_id_storage_key_key" ON "stored_file"("tenant_id", "storage_key");

-- CreateIndex
CREATE INDEX "notification_template_tenant_id_idx" ON "notification_template"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_template_tenant_id_key_channel_key" ON "notification_template"("tenant_id", "key", "channel");

-- CreateIndex
CREATE INDEX "notification_preference_tenant_id_user_id_idx" ON "notification_preference"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preference_user_id_key_channel_key" ON "notification_preference"("user_id", "key", "channel");

-- CreateIndex
CREATE INDEX "notification_tenant_id_recipient_id_read_at_idx" ON "notification"("tenant_id", "recipient_id", "read_at");

-- CreateIndex
CREATE INDEX "notification_tenant_id_status_idx" ON "notification"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_template" ADD CONSTRAINT "notification_template_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Files and notifications. Authority: PLA-CFG-002, MET-EVE-001→002, EXE-AUD-003.

ALTER TABLE "stored_file" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stored_file" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notification_template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_template" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notification_preference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preference" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification" FORCE ROW LEVEL SECURITY;

CREATE POLICY "stored_file_isolation" ON "stored_file"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "notification_template_isolation" ON "notification_template"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "notification_preference_isolation" ON "notification_preference"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- A recipient sees only their own notifications. Tenant isolation is not enough
-- here: a colleague's notification is inside the same tenant and still none of
-- their business.
CREATE POLICY "notification_own" ON "notification"
  USING (
    "tenant_id" = verity.current_tenant_id()
    AND "recipient_id" IN (
      SELECT m.user_id FROM tenant_membership m
      WHERE m.tenant_id = verity.current_tenant_id()
        AND m.user_id = "notification"."recipient_id"
    )
  )
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Bytes must be positive and a stored file must know its own size.
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_size_positive" CHECK ("byte_size" > 0);
-- A confirmed file has a checksum; an unconfirmed one has no business claiming
-- integrity it has not demonstrated.
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_confirmed_has_checksum"
  CHECK ("status" <> 'Stored' OR ("checksum" IS NOT NULL AND "confirmed_at" IS NOT NULL));

-- A stored file's identity is fixed once confirmed. Replacing the bytes behind a
-- reference is exactly how an evidence trail becomes deniable, so the key,
-- checksum and size are frozen at confirmation.
CREATE OR REPLACE FUNCTION verity.stored_file_immutable_once_stored()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'Stored' AND (
       NEW.storage_key IS DISTINCT FROM OLD.storage_key
    OR NEW.checksum    IS DISTINCT FROM OLD.checksum
    OR NEW.byte_size   IS DISTINCT FROM OLD.byte_size
  ) THEN
    RAISE EXCEPTION 'stored_file %: bytes are immutable once stored (EXE-AUD-003)', OLD.id
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "stored_file_immutable_once_stored"
  BEFORE UPDATE ON "stored_file"
  FOR EACH ROW EXECUTE FUNCTION verity.stored_file_immutable_once_stored();
