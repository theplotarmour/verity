-- ---------------------------------------------------------------------------
-- Accounting periods and the posting lock (slice 7)
--
-- Authority: taskplans/45_plywood_workflow_program.md §5;
-- PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-08; specification §76, §77.
--
-- Backdated stock, invoices, payments and corrections could alter a month that
-- had already been reviewed, reported and filed, and nothing recorded that they
-- had. A close is the moment a business says "this is what happened", and it is
-- only meaningful if the answer then stops changing.
-- ---------------------------------------------------------------------------

CREATE TABLE "plywood_accounting_period" (
  "id"              UUID NOT NULL,
  "tenant_id"       UUID NOT NULL,
  "period_key"      TEXT NOT NULL,
  "starts_at"       TIMESTAMP(3) NOT NULL,
  "ends_at"         TIMESTAMP(3) NOT NULL,
  "state"           TEXT NOT NULL DEFAULT 'open',
  "closed_at"       TIMESTAMP(3),
  "closed_by"       UUID,
  "reopened_at"     TIMESTAMP(3),
  "reopened_by"     UUID,
  "reopened_reason" TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "plywood_accounting_period_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plywood_accounting_period_key_shape" CHECK ("period_key" ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT "plywood_accounting_period_state" CHECK ("state" IN ('open', 'closed')),
  CONSTRAINT "plywood_accounting_period_window" CHECK ("ends_at" > "starts_at"),
  -- A closed period must say when and by whom. A lock with no signature is
  -- indistinguishable from a bug that set a flag.
  CONSTRAINT "plywood_accounting_period_closed_is_signed"
    CHECK ("state" <> 'closed' OR ("closed_at" IS NOT NULL AND "closed_by" IS NOT NULL)),
  -- Reopening requires a reason. Reopening a filed period without one IS the
  -- audit finding, so the database is where that rule lives.
  CONSTRAINT "plywood_accounting_period_reopen_is_reasoned"
    CHECK ("reopened_at" IS NULL OR (length(btrim(COALESCE("reopened_reason", ''))) >= 3
                                     AND "reopened_by" IS NOT NULL))
);

CREATE UNIQUE INDEX "plywood_accounting_period_tenant_id_period_key_key"
  ON "plywood_accounting_period"("tenant_id", "period_key");
CREATE UNIQUE INDEX "plywood_accounting_period_tenant_scoped_id"
  ON "plywood_accounting_period"("tenant_id", "id");
CREATE INDEX "plywood_accounting_period_tenant_id_state_idx"
  ON "plywood_accounting_period"("tenant_id", "state");

ALTER TABLE "plywood_accounting_period"
  ADD CONSTRAINT "plywood_accounting_period_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plywood_accounting_period" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_accounting_period" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_accounting_period_tenant_isolation ON "plywood_accounting_period"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());
