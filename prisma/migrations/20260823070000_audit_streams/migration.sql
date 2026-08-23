-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('AuthSuccess', 'AuthFailed', 'PermissionEscalated', 'PermissionRevoked', 'RoleAssigned', 'ConfigurationChanged', 'ApiKeyGenerated');

-- CreateTable
CREATE TABLE "activity" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_key" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "field_changed" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "command_key" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_audit_event" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "event_type" "SecurityEventType" NOT NULL,
    "actor_user_id" UUID,
    "ip_address" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_tenant_id_entity_key_entity_id_idx" ON "activity"("tenant_id", "entity_key", "entity_id");

-- CreateIndex
CREATE INDEX "activity_tenant_id_occurred_at_idx" ON "activity"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "security_audit_event_tenant_id_occurred_at_idx" ON "security_audit_event"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "security_audit_event_tenant_id_event_type_idx" ON "security_audit_event"("tenant_id", "event_type");

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_audit_event" ADD CONSTRAINT "security_audit_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Audit stream isolation and immutability
--
-- Authority: EXE-AUD-001 (operational stream, infinite retention), EXE-AUD-002
-- (security stream), EXE-AUD-003 ("the audit tables reject SQL UPDATE and DELETE
-- operations at the database constraint level"), MET-EVE-001 (events are
-- strictly write-once).
--
-- RLS alone would not satisfy EXE-AUD-003. Omitting an UPDATE policy stops the
-- application role, but a role with BYPASSRLS — the migration role, or anything
-- that acquires it later — would still be able to rewrite history. Triggers
-- apply to every role, so the lock survives a privilege change.
-- ---------------------------------------------------------------------------

ALTER TABLE "activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity" FORCE ROW LEVEL SECURITY;
ALTER TABLE "security_audit_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_audit_event" FORCE ROW LEVEL SECURITY;

CREATE POLICY "activity_read" ON "activity"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "activity_append" ON "activity"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());

CREATE POLICY "security_audit_event_read" ON "security_audit_event"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "security_audit_event_append" ON "security_audit_event"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Append-only enforcement that no role can bypass.
CREATE OR REPLACE FUNCTION verity.reject_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not permitted (EXE-AUD-003 / MET-EVE-001)',
    TG_TABLE_NAME, TG_OP
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER "activity_append_only"
  BEFORE UPDATE OR DELETE ON "activity"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

CREATE TRIGGER "security_audit_event_append_only"
  BEFORE UPDATE OR DELETE ON "security_audit_event"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

-- The event outbox is write-once too (MET-EVE-001), with one exception: the
-- dispatcher must be able to stamp delivery. Allowing a narrow UPDATE that
-- touches only `delivered_at` keeps the fact itself immutable while letting the
-- outbox pattern work; a blanket lock would make MET-EVE-002 unimplementable.
CREATE OR REPLACE FUNCTION verity.domain_event_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'domain_event is write-once: DELETE is not permitted (MET-EVE-001)'
      USING ERRCODE = '42501';
  END IF;

  IF ROW(NEW.id, NEW.tenant_id, NEW.name, NEW.entity_key, NEW.entity_id,
         NEW.command_key, NEW.actor_user_id, NEW.payload, NEW.occurred_at)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.tenant_id, OLD.name, OLD.entity_key, OLD.entity_id,
         OLD.command_key, OLD.actor_user_id, OLD.payload, OLD.occurred_at) THEN
    RAISE EXCEPTION 'domain_event is write-once: only delivered_at may change (MET-EVE-001)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "domain_event_append_only"
  BEFORE UPDATE OR DELETE ON "domain_event"
  FOR EACH ROW EXECUTE FUNCTION verity.domain_event_append_only();
