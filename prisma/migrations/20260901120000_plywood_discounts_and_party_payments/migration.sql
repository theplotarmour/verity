-- ---------------------------------------------------------------------------
-- Line discounts, provisional purchase bills, and party-level payments
--
-- Authority: taskplans/71_plywood_transaction_and_finance_overhaul.md.
--
-- Three changes, one migration, because they are one workflow: a clerk records
-- what was bought and sold — with the discount that was actually agreed — and
-- the money side follows without anyone raising a document by hand.
--
-- 1. DISCOUNTS. `unit_cost_paise` / `unit_price_paise` stay the NET figure, so
--    every existing reader — stock valuation, the payable, the purchase and
--    sales registers — is correct without knowing discounts exist. The list
--    price and the rate are recorded beside them for provenance only. This is
--    deliberately not "store the rate and compute the money on read": a rate
--    edit would then restate orders that were already placed at the old one.
--
-- 2. PROVISIONAL BILLS. A purchase bill raised automatically at goods receipt
--    from the order's own prices, before the supplier's paper arrives. It is a
--    real payable, because the goods are here. Its tax split is COMPUTED, so it
--    is provisional — meaning no confirmation row — and must never be filed as
--    input credit until the supplier's own document is recorded against it.
--
-- 3. PARTY PAYMENTS. `invoice_id` becomes nullable and the payment gains a
--    party and a direction. One cheque settling three bills is one payment and
--    three allocations, not three payments.
-- ---------------------------------------------------------------------------

-- 1 ------------------------------------------------------------------ discounts

ALTER TABLE "plywood_purchase_order_line"
  ADD COLUMN "list_unit_cost_paise" INTEGER,
  ADD COLUMN "discount_bps" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "plywood_sales_order_line"
  ADD COLUMN "list_unit_price_paise" INTEGER,
  ADD COLUMN "discount_bps" INTEGER NOT NULL DEFAULT 0;

-- A discount is a fraction of a price, so it lives in [0, 100). A 100% discount
-- is a free issue, which is a different transaction with different tax
-- treatment and must not be enterable as a rounding of "very cheap".
ALTER TABLE "plywood_purchase_order_line"
  ADD CONSTRAINT "plywood_purchase_order_line_discount_range"
  CHECK ("discount_bps" >= 0 AND "discount_bps" < 10000);
ALTER TABLE "plywood_sales_order_line"
  ADD CONSTRAINT "plywood_sales_order_line_discount_range"
  CHECK ("discount_bps" >= 0 AND "discount_bps" < 10000);

-- The net can never exceed the list. If it does, one of the two was written by
-- something that did not understand which field is which, and the difference
-- would surface much later as a margin that cannot be explained.
ALTER TABLE "plywood_purchase_order_line"
  ADD CONSTRAINT "plywood_purchase_order_line_net_not_above_list"
  CHECK ("list_unit_cost_paise" IS NULL OR "unit_cost_paise" <= "list_unit_cost_paise");
ALTER TABLE "plywood_sales_order_line"
  ADD CONSTRAINT "plywood_sales_order_line_net_not_above_list"
  CHECK ("list_unit_price_paise" IS NULL OR "unit_price_paise" <= "list_unit_price_paise");

-- 2 --------------------------------------------------------- provisional bills

-- A purchase bill raised automatically at goods receipt is PROVISIONAL: the
-- goods are here so the money is genuinely owed, but its tax split was computed
-- from the effective HSN rules rather than read off the supplier's paper, and a
-- computed split must never be filed as input credit.
--
-- This is NOT a boolean on plywood_invoice. That table is immutable by trigger
-- (20260831090000_plywood_integrity) and the rule is not being weakened for
-- convenience, so a flag there could be set and never cleared. Provisional
-- therefore means "no confirmation row exists", and confirming appends one.
-- A money difference between the computed figures and the supplier's is
-- corrected the way every other posted difference is: a debit or credit note.

CREATE TABLE "plywood_purchase_bill_confirmation" (
  "id"                      UUID NOT NULL,
  "tenant_id"               UUID NOT NULL,
  "invoice_id"              UUID NOT NULL,
  -- THEIR number. Ours is on the invoice and never changes.
  "supplier_invoice_number" TEXT NOT NULL,
  "supplier_invoice_date"   TIMESTAMP(3) NOT NULL,
  "taxable_paise"           INTEGER NOT NULL,
  "cgst_paise"              INTEGER NOT NULL DEFAULT 0,
  "sgst_paise"              INTEGER NOT NULL DEFAULT 0,
  "igst_paise"              INTEGER NOT NULL DEFAULT 0,
  "total_paise"             INTEGER NOT NULL,
  "confirmed_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_by"            UUID NOT NULL,

  CONSTRAINT "plywood_purchase_bill_confirmation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plywood_purchase_bill_confirmation_amounts_nonneg"
    CHECK ("taxable_paise" >= 0 AND "cgst_paise" >= 0 AND "sgst_paise" >= 0
           AND "igst_paise" >= 0 AND "total_paise" >= 0),
  -- The supplier's own parts must add to the supplier's own whole. One that
  -- does not is a transcription error, and it must not reach a return.
  CONSTRAINT "plywood_purchase_bill_confirmation_totals_agree"
    CHECK ("taxable_paise" + "cgst_paise" + "sgst_paise" + "igst_paise" = "total_paise"),
  CONSTRAINT "plywood_purchase_bill_confirmation_tax_kind"
    CHECK (NOT ("igst_paise" > 0 AND ("cgst_paise" > 0 OR "sgst_paise" > 0)))
);

CREATE UNIQUE INDEX "plywood_purchase_bill_confirmation_invoice"
  ON "plywood_purchase_bill_confirmation"("tenant_id", "invoice_id");
CREATE UNIQUE INDEX "plywood_purchase_bill_confirmation_tenant_scoped_id"
  ON "plywood_purchase_bill_confirmation"("tenant_id", "id");

ALTER TABLE "plywood_purchase_bill_confirmation"
  ADD CONSTRAINT "plywood_purchase_bill_confirmation_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_purchase_bill_confirmation"
  ADD CONSTRAINT "plywood_purchase_bill_confirmation_invoice_id_fkey"
  FOREIGN KEY ("tenant_id", "invoice_id")
  REFERENCES "plywood_invoice"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "plywood_purchase_bill_confirmation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_purchase_bill_confirmation" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_purchase_bill_confirmation_tenant_isolation
  ON "plywood_purchase_bill_confirmation"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Confirmation is a record of what a supplier sent, not a working note. It is
-- as immutable as the invoice it confirms.
CREATE TRIGGER plywood_purchase_bill_confirmation_immutable
  BEFORE UPDATE ON "plywood_purchase_bill_confirmation"
  FOR EACH ROW EXECUTE FUNCTION verity.plywood_posted_document_immutable();

-- Every purchase invoice that already exists was entered by hand from a
-- supplier's document, so each is confirmed by definition. Without this they
-- would all appear in the provisional queue asking to be re-entered.
INSERT INTO "plywood_purchase_bill_confirmation"
  ("id", "tenant_id", "invoice_id", "supplier_invoice_number", "supplier_invoice_date",
   "taxable_paise", "cgst_paise", "sgst_paise", "igst_paise", "total_paise",
   "confirmed_at", "confirmed_by")
SELECT gen_random_uuid(), i."tenant_id", i."id",
       COALESCE(i."custom_fields" ->> 'supplierInvoiceNumber', i."invoice_number"),
       i."issued_at",
       i."taxable_paise", i."cgst_paise", i."sgst_paise", i."igst_paise", i."total_paise",
       i."created_at", '00000000-0000-0000-0000-000000000000'::uuid
  FROM "plywood_invoice" i
 WHERE i."supplier_id" IS NOT NULL;

-- 3 ----------------------------------------------------------- party payments

ALTER TABLE "plywood_payment"
  ALTER COLUMN "invoice_id" DROP NOT NULL;

ALTER TABLE "plywood_payment"
  ADD COLUMN "customer_id" UUID,
  ADD COLUMN "supplier_id" UUID,
  ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'in';

-- Existing rows predate the party column and are all invoice-scoped. Their
-- party is the invoice's, and their direction follows from which side of the
-- invoice it was: money against a sales invoice came in, money against a
-- purchase invoice went out.
-- The immutability trigger is suspended for exactly this statement. It is not
-- a correction, which is what that trigger exists to prevent: it sets two
-- columns that were added moments ago on rows that could not have carried them,
-- and it touches NO monetary field. Without it the one-party CHECK below cannot
-- be added, because rows written before the column existed would violate it.
ALTER TABLE "plywood_payment" DISABLE TRIGGER "plywood_payment_immutable";

UPDATE "plywood_payment" p
   SET "customer_id" = i."customer_id",
       "supplier_id" = i."supplier_id",
       "direction"   = CASE WHEN i."customer_id" IS NOT NULL THEN 'in' ELSE 'out' END
  FROM "plywood_invoice" i
 WHERE i."id" = p."invoice_id";

ALTER TABLE "plywood_payment" ENABLE TRIGGER "plywood_payment_immutable";

ALTER TABLE "plywood_payment"
  ADD CONSTRAINT "plywood_payment_direction_known"
  CHECK ("direction" IN ('in', 'out'));

-- Exactly one party, always. A payment with neither cannot be shown on any
-- statement; one with both is two payments.
ALTER TABLE "plywood_payment"
  ADD CONSTRAINT "plywood_payment_one_party"
  CHECK (("customer_id" IS NOT NULL) <> ("supplier_id" IS NOT NULL));

ALTER TABLE "plywood_payment"
  ADD CONSTRAINT "plywood_payment_customer_id_fkey"
  FOREIGN KEY ("tenant_id", "customer_id")
  REFERENCES "plywood_customer"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "plywood_payment"
  ADD CONSTRAINT "plywood_payment_supplier_id_fkey"
  FOREIGN KEY ("tenant_id", "supplier_id")
  REFERENCES "plywood_supplier"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE INDEX "plywood_payment_tenant_id_customer_id_idx"
  ON "plywood_payment"("tenant_id", "customer_id");
CREATE INDEX "plywood_payment_tenant_id_supplier_id_idx"
  ON "plywood_payment"("tenant_id", "supplier_id");

CREATE TABLE "plywood_payment_allocation" (
  "id"           UUID NOT NULL,
  "tenant_id"    UUID NOT NULL,
  "payment_id"   UUID NOT NULL,
  "invoice_id"   UUID NOT NULL,
  "amount_paise" INTEGER NOT NULL,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "plywood_payment_allocation_pkey" PRIMARY KEY ("id"),
  -- Zero settles nothing and would appear on a statement as an event that did
  -- not happen. Negative is a reversal, which is a credit note, not this.
  CONSTRAINT "plywood_payment_allocation_amount_positive"
    CHECK ("amount_paise" > 0)
);

-- One allocation per payment per invoice. A second one against the same pair is
-- an increase to the first, and keeping them separate would make "how much of
-- this cheque went to that bill" a sum rather than a value.
CREATE UNIQUE INDEX "plywood_payment_allocation_payment_invoice"
  ON "plywood_payment_allocation"("tenant_id", "payment_id", "invoice_id");
CREATE UNIQUE INDEX "plywood_payment_allocation_tenant_scoped_id"
  ON "plywood_payment_allocation"("tenant_id", "id");
CREATE INDEX "plywood_payment_allocation_tenant_id_invoice_id_idx"
  ON "plywood_payment_allocation"("tenant_id", "invoice_id");

ALTER TABLE "plywood_payment_allocation"
  ADD CONSTRAINT "plywood_payment_allocation_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "plywood_payment_allocation"
  ADD CONSTRAINT "plywood_payment_allocation_payment_id_fkey"
  FOREIGN KEY ("tenant_id", "payment_id")
  REFERENCES "plywood_payment"("tenant_id", "id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "plywood_payment_allocation"
  ADD CONSTRAINT "plywood_payment_allocation_invoice_id_fkey"
  FOREIGN KEY ("tenant_id", "invoice_id")
  REFERENCES "plywood_invoice"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "plywood_payment_allocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plywood_payment_allocation" FORCE ROW LEVEL SECURITY;
CREATE POLICY plywood_payment_allocation_tenant_isolation ON "plywood_payment_allocation"
  USING ("tenant_id" = verity.current_tenant_id())
  WITH CHECK ("tenant_id" = verity.current_tenant_id());

-- Every payment that already exists settled exactly one invoice, in full as far
-- as this table is concerned, so each becomes one allocation. Without this the
-- new outstanding-by-allocation reads would report every historic invoice as
-- unpaid.
INSERT INTO "plywood_payment_allocation" ("id", "tenant_id", "payment_id", "invoice_id", "amount_paise", "created_at")
SELECT gen_random_uuid(), p."tenant_id", p."id", p."invoice_id", p."amount_paise", p."created_at"
  FROM "plywood_payment" p
 WHERE p."invoice_id" IS NOT NULL;
