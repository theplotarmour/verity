-- ---------------------------------------------------------------------------
-- Plywood integrity foundation (Task 46)
--
-- Authority: taskplans/45_plywood_workflow_program.md §4, §5;
-- PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-03, P0-05, P0-06; INV-002.
--
-- Three defects the audit found, closed at the level where they cannot be
-- forgotten by the next writer: the database.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. A posted financial document is immutable (P0-05, INV-002)
--
-- The finance migration added a BEFORE DELETE trigger on the invoice and
-- nothing else, so an invoice's amounts, tax rates, place of supply or number
-- could be rewritten in place — after it had been given to a customer and
-- after its tax had been reported.
--
-- Verity's invoices have no draft state: an invoice row exists only once it has
-- been raised, which makes "posted" and "exists" the same thing here. There is
-- therefore no legitimate UPDATE, and corrections are credit and debit notes
-- (rule freeze §5). The prohibition applies to EVERY role, including a
-- privileged one, for the same reason the audit tables do: a correction that a
-- migration could quietly make is not a correction.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verity.plywood_posted_document_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    '% is a posted financial document: UPDATE is never permitted, correct it with a credit or debit note',
    TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER plywood_invoice_immutable
  BEFORE UPDATE ON "plywood_invoice"
  FOR EACH ROW EXECUTE FUNCTION verity.plywood_posted_document_immutable();

CREATE TRIGGER plywood_invoice_line_immutable
  BEFORE UPDATE ON "plywood_invoice_line"
  FOR EACH ROW EXECUTE FUNCTION verity.plywood_posted_document_immutable();

CREATE TRIGGER plywood_payment_immutable
  BEFORE UPDATE ON "plywood_payment"
  FOR EACH ROW EXECUTE FUNCTION verity.plywood_posted_document_immutable();

-- ---------------------------------------------------------------------------
-- 2. One invoice per order (P0-06)
--
-- The application checked this and two concurrent requests could both pass the
-- check before either wrote. A partial unique index is the version of that rule
-- that cannot lose a race.
--
-- Partial, because the same table holds sales invoices (customer + sales order)
-- and purchase invoices (supplier + purchase order), and a NULL order id must
-- not collide with another NULL.
--
-- Note for the slice that adds partial invoicing: when an order may legitimately
-- carry more than one invoice, this index is replaced by a quantity-allocation
-- constraint, not simply dropped.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX plywood_invoice_one_per_sales_order
  ON "plywood_invoice" ("tenant_id", "sales_order_id")
  WHERE "sales_order_id" IS NOT NULL;

CREATE UNIQUE INDEX plywood_invoice_one_per_purchase_order
  ON "plywood_invoice" ("tenant_id", "purchase_order_id")
  WHERE "purchase_order_id" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Amount and quantity sign constraints — ALREADY PRESENT, deliberately not
--    re-added.
--
-- The audit listed these as missing. They are not: `plywood_payment_amount_positive`,
-- `plywood_invoice_amounts_non_negative`, `plywood_invoice_total_is_its_parts`,
-- `plywood_invoice_tax_pairing` and `plywood_stock_reservation_qty_positive`
-- already exist from the finance and trading migrations. Verified against the
-- live database before writing this file rather than assumed from the report.
-- ---------------------------------------------------------------------------
