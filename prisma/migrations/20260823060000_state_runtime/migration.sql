-- CreateEnum
CREATE TYPE "StateCategory" AS ENUM ('Draft', 'Pending', 'Active', 'Blocked', 'Completed', 'Cancelled');

-- CreateTable
CREATE TABLE "state_definition" (
    "id" UUID NOT NULL,
    "entity_key" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" "StateCategory" NOT NULL,
    "is_initial" BOOLEAN NOT NULL DEFAULT false,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "state_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transition_definition" (
    "id" UUID NOT NULL,
    "entity_key" TEXT NOT NULL,
    "from_state_id" UUID NOT NULL,
    "to_state_id" UUID NOT NULL,
    "command_key" TEXT,

    CONSTRAINT "transition_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_status_label" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "state_id" UUID NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "tenant_status_label_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "state_definition_entity_key_idx" ON "state_definition"("entity_key");

-- CreateIndex
CREATE UNIQUE INDEX "state_definition_entity_key_key_key" ON "state_definition"("entity_key", "key");

-- CreateIndex
CREATE INDEX "transition_definition_entity_key_idx" ON "transition_definition"("entity_key");

-- CreateIndex
CREATE UNIQUE INDEX "transition_definition_from_state_id_to_state_id_key" ON "transition_definition"("from_state_id", "to_state_id");

-- CreateIndex
CREATE INDEX "tenant_status_label_tenant_id_idx" ON "tenant_status_label"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_status_label_tenant_id_state_id_key" ON "tenant_status_label"("tenant_id", "state_id");

-- AddForeignKey
ALTER TABLE "state_definition" ADD CONSTRAINT "state_definition_entity_key_fkey" FOREIGN KEY ("entity_key") REFERENCES "entity_definition"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_definition" ADD CONSTRAINT "transition_definition_from_state_id_fkey" FOREIGN KEY ("from_state_id") REFERENCES "state_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transition_definition" ADD CONSTRAINT "transition_definition_to_state_id_fkey" FOREIGN KEY ("to_state_id") REFERENCES "state_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_status_label" ADD CONSTRAINT "tenant_status_label_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_status_label" ADD CONSTRAINT "tenant_status_label_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "state_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- State runtime isolation
--
-- state_definition and transition_definition are GLOBAL capability metadata, on
-- the same footing as entity_definition: a lifecycle belongs to the capability
-- that owns the entity and is identical for every tenant. Readable inside a
-- tenant context, writable by no application role — a tenant must not be able to
-- add a transition and thereby invent a path its capability never sanctioned.
--
-- tenant_status_label is the tenant-configurable part (MET-STA-002): renaming a
-- state, never adding one. The engine keeps reasoning about the category
-- underneath, which is what MET-STA-004 requires of SLA clocks.
-- ---------------------------------------------------------------------------

ALTER TABLE "state_definition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "state_definition" FORCE ROW LEVEL SECURITY;
ALTER TABLE "transition_definition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transition_definition" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_status_label" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_status_label" FORCE ROW LEVEL SECURITY;

CREATE POLICY "state_definition_read" ON "state_definition"
  FOR SELECT USING (verity.current_tenant_id() IS NOT NULL);

CREATE POLICY "transition_definition_read" ON "transition_definition"
  FOR SELECT USING (verity.current_tenant_id() IS NOT NULL);

CREATE POLICY "tenant_status_label_isolation" ON "tenant_status_label"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Exactly one initial state per entity (MET-STA-001: an entity must always exist
-- in exactly one valid state, which requires an unambiguous starting point).
CREATE UNIQUE INDEX "state_definition_one_initial_per_entity"
  ON "state_definition" ("entity_key") WHERE "is_initial";
