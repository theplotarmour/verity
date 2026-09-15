-- ---------------------------------------------------------------------------
-- Colonel Kebabz Phase 4 (lean V1): Expenses + Cash Reconciliation (PRD §44-45)
-- ---------------------------------------------------------------------------
-- Hand-isolated from `prisma migrate diff` — same reasoning as prior slices:
-- the live DB still carries unrelated pre-existing drift from
-- `20260904180000_trading_capability_extraction`, untouched here.

CREATE TABLE "expense" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "vendor" TEXT,
    "amount_minor" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL,
    "expense_date" DATE NOT NULL,
    "receipt_evidence_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "recorded_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_cash_reconciliation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "opening_cash_minor" INTEGER NOT NULL,
    "cash_withdrawn_minor" INTEGER NOT NULL DEFAULT 0,
    "actual_cash_minor" INTEGER,
    "variance_note" TEXT,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "daily_cash_reconciliation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expense_tenant_id_location_id_expense_date_idx" ON "expense"("tenant_id", "location_id", "expense_date");

CREATE UNIQUE INDEX "daily_cash_reconciliation_tenant_id_location_id_date_key" ON "daily_cash_reconciliation"("tenant_id", "location_id", "date");

ALTER TABLE "expense" ADD CONSTRAINT "expense_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expense" ADD CONSTRAINT "expense_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "daily_cash_reconciliation" ADD CONSTRAINT "daily_cash_reconciliation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_cash_reconciliation" ADD CONSTRAINT "daily_cash_reconciliation_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense" FORCE ROW LEVEL SECURITY;
CREATE POLICY "expense_isolation" ON "expense"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "daily_cash_reconciliation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_cash_reconciliation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "daily_cash_reconciliation_isolation" ON "daily_cash_reconciliation"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: Finance (Colonel Kebabz Phase 4)
-- ---------------------------------------------------------------------------

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at)
VALUES (
  'verity.capability.finance', 'Finance', '1.0.0',
  ARRAY['verity.capability.dinein', 'verity.capability.location'],
  ARRAY['verity.finance.expense', 'verity.finance.cash_reconciliation'],
  now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.finance.expense', 'verity.capability.finance', 'Persistent', 'expense', true),
  ('verity.finance.cash_reconciliation', 'verity.capability.finance', 'Persistent', 'daily_cash_reconciliation', true)
ON CONFLICT (key) DO NOTHING;
