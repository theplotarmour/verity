-- CreateTable
CREATE TABLE "domain_event" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "entity_key" TEXT NOT NULL,
    "entity_id" UUID,
    "command_key" TEXT,
    "actor_user_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),

    CONSTRAINT "domain_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "domain_event_tenant_id_occurred_at_idx" ON "domain_event"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "domain_event_delivered_at_idx" ON "domain_event"("delivered_at");

-- AddForeignKey
ALTER TABLE "domain_event" ADD CONSTRAINT "domain_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Event outbox isolation and immutability
--
-- Authority: MET-ACT-004 (events emitted on commit, never on rollback),
-- MET-EVE-001→002, EXE-AUD (an event is evidence and must not be rewritten).
--
-- SELECT and INSERT only. There is deliberately no UPDATE or DELETE policy, so
-- the application role cannot alter or erase a recorded fact — an event that
-- could be rewritten is not evidence. Marking delivery is a dispatcher concern
-- and runs as the migration/dispatcher role.
-- ---------------------------------------------------------------------------

ALTER TABLE "domain_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "domain_event" FORCE ROW LEVEL SECURITY;

CREATE POLICY "domain_event_read" ON "domain_event"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());

CREATE POLICY "domain_event_append" ON "domain_event"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
