-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "memo" TEXT,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversal_of_id" UUID,
    "posted_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_line" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "journal_entry_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "debit_minor" INTEGER NOT NULL DEFAULT 0,
    "credit_minor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "journal_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_item_group" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "inventory_item_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_item" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_group_id" UUID,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit_label" TEXT NOT NULL DEFAULT 'units',
    "reorder_level" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_stock_balance" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_stock_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_stock_movement" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "reference" TEXT,
    "moved_by_id" UUID NOT NULL,
    "moved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_department" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "hr_department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_employee" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "department_id" UUID,
    "designation" TEXT,
    "date_of_joining" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "hr_employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_type" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "days_per_year" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hr_leave_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_application" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_leave_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_leave_decision" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "leave_application_id" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "decided_by_id" UUID NOT NULL,
    "note" TEXT,
    "decided_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_leave_decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_meter" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate_per_unit_minor" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "billing_meter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_meter_reading" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "meter_id" UUID NOT NULL,
    "reading_units" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" UUID NOT NULL,

    CONSTRAINT "billing_meter_reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_period" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "billing_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoice" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "meter_id" UUID NOT NULL,
    "billing_period_id" UUID NOT NULL,
    "usage_units" INTEGER NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_invoice_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE INDEX "account_tenant_id_type_idx" ON "account"("tenant_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "account_tenant_id_code_key" ON "account"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "account_tenant_id_id_key" ON "account"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "journal_entry_tenant_id_posted_at_idx" ON "journal_entry"("tenant_id", "posted_at");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_tenant_id_id_key" ON "journal_entry"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "journal_line_tenant_id_account_id_idx" ON "journal_line"("tenant_id", "account_id");

-- CreateIndex
CREATE INDEX "journal_line_tenant_id_journal_entry_id_idx" ON "journal_line"("tenant_id", "journal_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_group_tenant_id_name_key" ON "inventory_item_group"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_tenant_id_sku_key" ON "inventory_item"("tenant_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_tenant_id_id_key" ON "inventory_item"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_stock_balance_tenant_id_item_id_location_id_key" ON "inventory_stock_balance"("tenant_id", "item_id", "location_id");

-- CreateIndex
CREATE INDEX "inventory_stock_movement_tenant_id_item_id_idx" ON "inventory_stock_movement"("tenant_id", "item_id");

-- CreateIndex
CREATE INDEX "inventory_stock_movement_tenant_id_location_id_moved_at_idx" ON "inventory_stock_movement"("tenant_id", "location_id", "moved_at");

-- CreateIndex
CREATE UNIQUE INDEX "hr_department_tenant_id_name_key" ON "hr_department"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employee_tenant_id_party_id_key" ON "hr_employee"("tenant_id", "party_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_leave_type_tenant_id_name_key" ON "hr_leave_type"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "hr_leave_application_tenant_id_employee_id_idx" ON "hr_leave_application"("tenant_id", "employee_id");

-- CreateIndex
CREATE INDEX "hr_leave_decision_tenant_id_leave_application_id_idx" ON "hr_leave_decision"("tenant_id", "leave_application_id");

-- CreateIndex
CREATE INDEX "billing_meter_tenant_id_party_id_idx" ON "billing_meter"("tenant_id", "party_id");

-- CreateIndex
CREATE INDEX "billing_meter_reading_tenant_id_meter_id_read_at_idx" ON "billing_meter_reading"("tenant_id", "meter_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoice_tenant_id_meter_id_billing_period_id_key" ON "billing_invoice"("tenant_id", "meter_id", "billing_period_id");


-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "journal_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_line" ADD CONSTRAINT "journal_line_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item_group" ADD CONSTRAINT "inventory_item_group_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_item_group_id_fkey" FOREIGN KEY ("item_group_id") REFERENCES "inventory_item_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_balance" ADD CONSTRAINT "inventory_stock_balance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_balance" ADD CONSTRAINT "inventory_stock_balance_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_balance" ADD CONSTRAINT "inventory_stock_balance_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_stock_movement" ADD CONSTRAINT "inventory_stock_movement_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_movement" ADD CONSTRAINT "inventory_stock_movement_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_movement" ADD CONSTRAINT "inventory_stock_movement_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "location"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hr_department" ADD CONSTRAINT "hr_department_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "hr_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_type" ADD CONSTRAINT "hr_leave_type_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_application" ADD CONSTRAINT "hr_leave_application_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_application" ADD CONSTRAINT "hr_leave_application_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_application" ADD CONSTRAINT "hr_leave_application_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "hr_leave_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_decision" ADD CONSTRAINT "hr_leave_decision_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_leave_decision" ADD CONSTRAINT "hr_leave_decision_leave_application_id_fkey" FOREIGN KEY ("leave_application_id") REFERENCES "hr_leave_application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_meter" ADD CONSTRAINT "billing_meter_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_meter" ADD CONSTRAINT "billing_meter_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_meter_reading" ADD CONSTRAINT "billing_meter_reading_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_meter_reading" ADD CONSTRAINT "billing_meter_reading_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "billing_meter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_period" ADD CONSTRAINT "billing_period_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoice" ADD CONSTRAINT "billing_invoice_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoice" ADD CONSTRAINT "billing_invoice_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "billing_meter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoice" ADD CONSTRAINT "billing_invoice_billing_period_id_fkey" FOREIGN KEY ("billing_period_id") REFERENCES "billing_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- CAPABILITY INSTALL: Accounting, Inventory, HR, Billing (Tasks 72/73/78/77)
-- ---------------------------------------------------------------------------

ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" FORCE ROW LEVEL SECURITY;
CREATE POLICY "account_isolation" ON "account"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "journal_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_entry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "journal_entry_read" ON "journal_entry"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "journal_entry_append" ON "journal_entry"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "journal_entry_append_only"
  BEFORE UPDATE OR DELETE ON "journal_entry"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

ALTER TABLE "journal_line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_line" FORCE ROW LEVEL SECURITY;
CREATE POLICY "journal_line_read" ON "journal_line"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "journal_line_append" ON "journal_line"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "journal_line_append_only"
  BEFORE UPDATE OR DELETE ON "journal_line"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

ALTER TABLE "inventory_item_group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_item_group" FORCE ROW LEVEL SECURITY;
CREATE POLICY "inventory_item_group_isolation" ON "inventory_item_group"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "inventory_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_item" FORCE ROW LEVEL SECURITY;
CREATE POLICY "inventory_item_isolation" ON "inventory_item"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "inventory_stock_balance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_stock_balance" FORCE ROW LEVEL SECURITY;
CREATE POLICY "inventory_stock_balance_isolation" ON "inventory_stock_balance"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "inventory_stock_movement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_stock_movement" FORCE ROW LEVEL SECURITY;
CREATE POLICY "inventory_stock_movement_read" ON "inventory_stock_movement"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "inventory_stock_movement_append" ON "inventory_stock_movement"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "inventory_stock_movement_append_only"
  BEFORE UPDATE OR DELETE ON "inventory_stock_movement"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

ALTER TABLE "hr_department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hr_department" FORCE ROW LEVEL SECURITY;
CREATE POLICY "hr_department_isolation" ON "hr_department"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "hr_employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hr_employee" FORCE ROW LEVEL SECURITY;
CREATE POLICY "hr_employee_isolation" ON "hr_employee"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "hr_leave_type" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hr_leave_type" FORCE ROW LEVEL SECURITY;
CREATE POLICY "hr_leave_type_isolation" ON "hr_leave_type"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "hr_leave_application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hr_leave_application" FORCE ROW LEVEL SECURITY;
CREATE POLICY "hr_leave_application_isolation" ON "hr_leave_application"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "hr_leave_decision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hr_leave_decision" FORCE ROW LEVEL SECURITY;
CREATE POLICY "hr_leave_decision_read" ON "hr_leave_decision"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "hr_leave_decision_append" ON "hr_leave_decision"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "hr_leave_decision_append_only"
  BEFORE UPDATE OR DELETE ON "hr_leave_decision"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

ALTER TABLE "billing_meter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_meter" FORCE ROW LEVEL SECURITY;
CREATE POLICY "billing_meter_isolation" ON "billing_meter"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "billing_meter_reading" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_meter_reading" FORCE ROW LEVEL SECURITY;
CREATE POLICY "billing_meter_reading_read" ON "billing_meter_reading"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "billing_meter_reading_append" ON "billing_meter_reading"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "billing_meter_reading_append_only"
  BEFORE UPDATE OR DELETE ON "billing_meter_reading"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

ALTER TABLE "billing_period" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_period" FORCE ROW LEVEL SECURITY;
CREATE POLICY "billing_period_isolation" ON "billing_period"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

ALTER TABLE "billing_invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_invoice" FORCE ROW LEVEL SECURITY;
CREATE POLICY "billing_invoice_read" ON "billing_invoice"
  FOR SELECT USING ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "billing_invoice_append" ON "billing_invoice"
  FOR INSERT WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE TRIGGER "billing_invoice_append_only"
  BEFORE UPDATE OR DELETE ON "billing_invoice"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

INSERT INTO "capability_definition" (id, name, version, dependencies, entity_types, updated_at) VALUES
  ('verity.capability.accounting', 'Accounting', '1.0.0',
   ARRAY[]::text[], ARRAY['verity.accounting.account', 'verity.accounting.journal_entry'], now()),
  ('verity.capability.inventory', 'Inventory', '1.0.0',
   ARRAY['verity.capability.location'], ARRAY['verity.inventory.item', 'verity.inventory.stock'], now()),
  ('verity.capability.hr', 'HR', '1.0.0',
   ARRAY[]::text[], ARRAY['verity.hr.employee', 'verity.hr.leave'], now()),
  ('verity.capability.billing', 'Billing', '1.0.0',
   ARRAY[]::text[], ARRAY['verity.billing.meter', 'verity.billing.invoice'], now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.accounting.account',       'verity.capability.accounting', 'Persistent', 'account',        true),
  ('verity.accounting.journal_entry', 'verity.capability.accounting', 'Persistent', 'journal_entry',  true),
  ('verity.inventory.item',           'verity.capability.inventory',  'Persistent', 'inventory_item', true),
  ('verity.inventory.stock',          'verity.capability.inventory',  'Persistent', 'inventory_stock_balance', true),
  ('verity.hr.employee',              'verity.capability.hr',         'Persistent', 'hr_employee',    true),
  ('verity.hr.leave',                 'verity.capability.hr',         'Persistent', 'hr_leave_application', true),
  ('verity.billing.meter',            'verity.capability.billing',    'Persistent', 'billing_meter',  true),
  ('verity.billing.invoice',          'verity.capability.billing',    'Persistent', 'billing_invoice', true)
ON CONFLICT (key) DO NOTHING;
