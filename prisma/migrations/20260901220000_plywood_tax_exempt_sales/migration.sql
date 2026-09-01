-- ---------------------------------------------------------------------------
-- A sale that carries no GST, and the reason it does not
--
-- Requested: "give the option to remove GST on specific orders."
--
-- That is a real category — an exempt or nil-rated supply, a sale to a
-- customer under composition, a job the business does not charge tax on — and
-- it is also the single easiest place in an accounting system to under-declare
-- by accident. So the exemption is recorded rather than merely applied:
--
--   * a REASON is required, enforced by the database and not only by the form,
--     because a zero-tax invoice with no stated ground cannot be told apart
--     from an under-declared one when somebody asks a year later;
--   * the reason is snapshotted onto the invoice, so the document carries its
--     own justification and does not depend on an order that may since have
--     been amended;
--   * exempt invoices are surfaced on the tax exceptions page, so exempting a
--     sale makes it MORE visible, not less.
--
-- Deliberately on the sales order only. A purchase bill's tax is the
-- supplier's to decide and this business does not get to zero it — that would
-- not remove a liability, it would forfeit a credit.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_sales_order"
  ADD COLUMN "tax_exempt" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tax_exempt_reason" TEXT;

ALTER TABLE "plywood_sales_order"
  ADD CONSTRAINT "plywood_sales_order_exempt_needs_a_reason"
  CHECK (
    NOT "tax_exempt"
    OR ("tax_exempt_reason" IS NOT NULL AND length(btrim("tax_exempt_reason")) >= 3)
  );

-- And the same rule the other way: a reason without an exemption is a note
-- somebody wrote and then did not apply, which reads on screen as though the
-- sale were exempt when it is not.
ALTER TABLE "plywood_sales_order"
  ADD CONSTRAINT "plywood_sales_order_reason_needs_an_exemption"
  CHECK ("tax_exempt" OR "tax_exempt_reason" IS NULL);

ALTER TABLE "plywood_invoice"
  ADD COLUMN "tax_exempt_reason" TEXT;

-- A document with a stated exemption must actually carry no tax. Without this
-- an invoice could claim a ground for charging nothing while charging
-- something, and the return would disagree with the paper.
ALTER TABLE "plywood_invoice"
  ADD CONSTRAINT "plywood_invoice_exempt_carries_no_tax"
  CHECK (
    "tax_exempt_reason" IS NULL
    OR ("cgst_paise" = 0 AND "sgst_paise" = 0 AND "igst_paise" = 0)
  );
