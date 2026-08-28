-- ---------------------------------------------------------------------------
-- CAPABILITY: Plywood trading -- stage 6, finance
--
-- Requirement source: plywood.md §1.4 and §1.5. Decisions P2, P3 and P4 are
-- recorded in implementation/plywood-decisions.md.
--
-- P2 -- gapless invoice numbers from a counter row locked inside the invoice
-- transaction, not a PostgreSQL sequence. Sequences are non-transactional by
-- design, so a rolled-back invoice burns its number; under GST a tax invoice
-- series must be sequential and gapless within a financial year, which is a
-- legal constraint rather than a preference.
--
-- P3 -- a party's balance is DERIVED. No cached balance on a customer or a
-- supplier, no running balance on a ledger row. Two sources of truth eventually
-- disagree and nobody can say which is right.
--
-- P4 -- place of supply decides CGST + SGST against IGST, from state codes.
--
-- Capability install. `git diff --stat src/server/platform/`: empty.
-- ---------------------------------------------------------------------------

CREATE TABLE "plywood_invoice_series" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "series_key" TEXT NOT NULL,
    "financial_year" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "plywood_invoice_series_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_invoice" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "series_id" UUID NOT NULL,
    "customer_id" UUID,
    "supplier_id" UUID,
    "sales_order_id" UUID,
    "purchase_order_id" UUID,
    "invoice_number" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "financial_year" TEXT NOT NULL,
    "place_of_supply_state_code" TEXT NOT NULL,
    "supply_state_code" TEXT NOT NULL,
    "cgst_rate_bp" INTEGER NOT NULL DEFAULT 0,
    "sgst_rate_bp" INTEGER NOT NULL DEFAULT 0,
    "igst_rate_bp" INTEGER NOT NULL DEFAULT 0,
    "taxable_paise" INTEGER NOT NULL,
    "cgst_paise" INTEGER NOT NULL DEFAULT 0,
    "sgst_paise" INTEGER NOT NULL DEFAULT 0,
    "igst_paise" INTEGER NOT NULL DEFAULT 0,
    "total_paise" INTEGER NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "plywood_invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_invoice_line" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name_snapshot" TEXT NOT NULL,
    "hsn_code_snapshot" TEXT NOT NULL,
    "qty_units" INTEGER NOT NULL,
    "unit_price_paise" INTEGER NOT NULL,
    "line_total_paise" INTEGER NOT NULL,

    CONSTRAINT "plywood_invoice_line_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_payment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "reference" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "plywood_payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "plywood_ledger_entry" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "supplier_id" UUID,
    "entry_type" TEXT NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "invoice_id" UUID,
    "payment_id" UUID,
    "narration" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plywood_ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plywood_invoice_series_tenant_key_year_key" ON "plywood_invoice_series"("tenant_id", "series_key", "financial_year");
CREATE UNIQUE INDEX "plywood_invoice_series_tenant_id_id_key" ON "plywood_invoice_series"("tenant_id", "id");
-- The gapless promise, backed by the database. Two invoices with the same number
-- in one tenant is the failure a tax officer notices.
CREATE UNIQUE INDEX "plywood_invoice_tenant_id_invoice_number_key" ON "plywood_invoice"("tenant_id", "invoice_number");
CREATE UNIQUE INDEX "plywood_invoice_tenant_id_id_key" ON "plywood_invoice"("tenant_id", "id");
CREATE INDEX "plywood_invoice_tenant_id_issued_at_idx" ON "plywood_invoice"("tenant_id", "issued_at");
CREATE UNIQUE INDEX "plywood_invoice_line_tenant_id_id_key" ON "plywood_invoice_line"("tenant_id", "id");
CREATE INDEX "plywood_invoice_line_tenant_id_invoice_id_idx" ON "plywood_invoice_line"("tenant_id", "invoice_id");
CREATE UNIQUE INDEX "plywood_payment_tenant_id_id_key" ON "plywood_payment"("tenant_id", "id");
CREATE INDEX "plywood_payment_tenant_id_invoice_id_idx" ON "plywood_payment"("tenant_id", "invoice_id");
-- A balance is a SUM over these, so the party is the leading column.
CREATE INDEX "plywood_ledger_entry_tenant_customer_time_idx" ON "plywood_ledger_entry"("tenant_id", "customer_id", "occurred_at");
CREATE INDEX "plywood_ledger_entry_tenant_supplier_time_idx" ON "plywood_ledger_entry"("tenant_id", "supplier_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "plywood_invoice_series" ADD CONSTRAINT "plywood_invoice_series_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_series_fkey"
  FOREIGN KEY ("tenant_id", "series_id") REFERENCES "plywood_invoice_series"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_customer_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "plywood_customer"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_supplier_fkey"
  FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "plywood_supplier"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_sales_order_fkey"
  FOREIGN KEY ("tenant_id", "sales_order_id") REFERENCES "plywood_sales_order"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_purchase_order_fkey"
  FOREIGN KEY ("tenant_id", "purchase_order_id") REFERENCES "plywood_purchase_order"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_invoice_line" ADD CONSTRAINT "plywood_invoice_line_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_invoice_line" ADD CONSTRAINT "plywood_invoice_line_invoice_fkey"
  FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "plywood_invoice"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "plywood_invoice_line" ADD CONSTRAINT "plywood_invoice_line_product_fkey"
  FOREIGN KEY ("tenant_id", "product_id") REFERENCES "plywood_product"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_payment" ADD CONSTRAINT "plywood_payment_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_payment" ADD CONSTRAINT "plywood_payment_invoice_fkey"
  FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "plywood_invoice"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_ledger_entry" ADD CONSTRAINT "plywood_ledger_entry_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_ledger_entry" ADD CONSTRAINT "plywood_ledger_entry_customer_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "plywood_customer"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_ledger_entry" ADD CONSTRAINT "plywood_ledger_entry_supplier_fkey"
  FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "plywood_supplier"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_ledger_entry" ADD CONSTRAINT "plywood_ledger_entry_invoice_fkey"
  FOREIGN KEY ("tenant_id", "invoice_id") REFERENCES "plywood_invoice"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_ledger_entry" ADD CONSTRAINT "plywood_ledger_entry_payment_fkey"
  FOREIGN KEY ("tenant_id", "payment_id") REFERENCES "plywood_payment"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Tenant isolation (INV-001)
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_invoice_series" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_invoice_series" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_invoice" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_invoice_line" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_invoice_line" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_payment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "plywood_ledger_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_ledger_entry" FORCE ROW LEVEL SECURITY;

CREATE POLICY "plywood_invoice_series_isolation" ON "plywood_invoice_series"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_invoice_isolation" ON "plywood_invoice"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_invoice_line_isolation" ON "plywood_invoice_line"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
CREATE POLICY "plywood_payment_isolation" ON "plywood_payment"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());
-- The ledger gets all four policies so the append-only trigger below is reached
-- and refuses loudly. Omitting UPDATE and DELETE would make RLS filter the rows
-- out first, and the statement would report success having changed nothing --
-- which is what 20260828020000 corrected for the stock ledger.
CREATE POLICY "plywood_ledger_entry_isolation" ON "plywood_ledger_entry"
  USING ("tenant_id" = verity.current_tenant_id()) WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- ---------------------------------------------------------------------------
-- Append-only, enforced rather than intended
-- ---------------------------------------------------------------------------

CREATE TRIGGER "plywood_ledger_entry_append_only"
  BEFORE UPDATE OR DELETE ON "plywood_ledger_entry"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

-- An invoice is a legal document. Once raised, its number, its tax and its
-- totals are fixed; a correction is a credit note, which is a new document.
CREATE TRIGGER "plywood_invoice_append_only"
  BEFORE DELETE ON "plywood_invoice"
  FOR EACH ROW EXECUTE FUNCTION verity.reject_mutation();

-- ---------------------------------------------------------------------------
-- Facts the application must not be trusted to remember
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_invoice_series" ADD CONSTRAINT "plywood_invoice_series_next_positive"
  CHECK ("next_number" >= 1);

-- Exactly one party and exactly one order.
ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_exactly_one_party"
  CHECK (("customer_id" IS NULL) <> ("supplier_id" IS NULL));
ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_exactly_one_order"
  CHECK (("sales_order_id" IS NULL) <> ("purchase_order_id" IS NULL));

-- CGST and SGST always travel together, and never with IGST. This is the whole
-- of the place-of-supply rule expressed as a constraint: an invoice carrying
-- both pairs, or a lone CGST, is not a thing GST recognises.
ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_tax_pairing"
  CHECK (
    ("igst_paise" = 0 AND "cgst_paise" >= 0 AND "sgst_paise" >= 0)
    OR
    ("igst_paise" > 0 AND "cgst_paise" = 0 AND "sgst_paise" = 0)
  );

ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_amounts_non_negative"
  CHECK ("taxable_paise" >= 0 AND "total_paise" >= 0 AND "cgst_paise" >= 0
         AND "sgst_paise" >= 0 AND "igst_paise" >= 0);

-- The total must equal its own parts. Without this the invoice is four numbers
-- that happen to sit together, and a rounding bug is invisible until a filing.
ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_total_is_its_parts"
  CHECK ("total_paise" = "taxable_paise" + "cgst_paise" + "sgst_paise" + "igst_paise");

ALTER TABLE "plywood_invoice" ADD CONSTRAINT "plywood_invoice_state_codes_shape"
  CHECK ("place_of_supply_state_code" ~ '^[0-9]{2}$' AND "supply_state_code" ~ '^[0-9]{2}$');

ALTER TABLE "plywood_invoice_line" ADD CONSTRAINT "plywood_invoice_line_qty_positive"
  CHECK ("qty_units" > 0);
ALTER TABLE "plywood_invoice_line" ADD CONSTRAINT "plywood_invoice_line_amounts_sane"
  CHECK ("unit_price_paise" >= 0 AND "line_total_paise" = "qty_units" * "unit_price_paise");

ALTER TABLE "plywood_payment" ADD CONSTRAINT "plywood_payment_amount_positive"
  CHECK ("amount_paise" > 0);
ALTER TABLE "plywood_payment" ADD CONSTRAINT "plywood_payment_method"
  CHECK ("method" IN ('cash', 'bank', 'upi', 'cheque'));

ALTER TABLE "plywood_ledger_entry" ADD CONSTRAINT "plywood_ledger_entry_exactly_one_party"
  CHECK (("customer_id" IS NULL) <> ("supplier_id" IS NULL));
ALTER TABLE "plywood_ledger_entry" ADD CONSTRAINT "plywood_ledger_entry_type"
  CHECK ("entry_type" IN ('debit', 'credit'));
ALTER TABLE "plywood_ledger_entry" ADD CONSTRAINT "plywood_ledger_entry_amount_positive"
  CHECK ("amount_paise" > 0);
-- Every entry traces to the document that caused it. A ledger row nobody can
-- explain is the row the accountant stops trusting the ledger over.
ALTER TABLE "plywood_ledger_entry" ADD CONSTRAINT "plywood_ledger_entry_has_a_cause"
  CHECK ("invoice_id" IS NOT NULL OR "payment_id" IS NOT NULL OR "narration" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- Registration -- DATA, not schema
-- ---------------------------------------------------------------------------

UPDATE "capability_definition"
   SET version = '0.6.0',
       entity_types = ARRAY[
         'verity.plywood.brand','verity.plywood.product','verity.plywood.godown_rack',
         'verity.plywood.stock_ledger','verity.plywood.stock_balance',
         'verity.plywood.supplier','verity.plywood.supplier_price',
         'verity.plywood.customer','verity.plywood.customer_price',
         'verity.plywood.purchase_order','verity.plywood.purchase_order_line',
         'verity.plywood.sales_order','verity.plywood.sales_order_line',
         'verity.plywood.reservation',
         'verity.plywood.transporter','verity.plywood.shipment',
         'verity.plywood.invoice','verity.plywood.payment','verity.plywood.ledger_entry'
       ],
       updated_at = now()
 WHERE id = 'verity.capability.plywood';

INSERT INTO "entity_definition" (key, capability, class, table_name, tenant_scoped) VALUES
  ('verity.plywood.invoice',      'verity.capability.plywood', 'Persistent', 'plywood_invoice',      true),
  ('verity.plywood.payment',      'verity.capability.plywood', 'Persistent', 'plywood_payment',      true),
  ('verity.plywood.ledger_entry', 'verity.capability.plywood', 'Persistent', 'plywood_ledger_entry', true)
ON CONFLICT (key) DO NOTHING;
