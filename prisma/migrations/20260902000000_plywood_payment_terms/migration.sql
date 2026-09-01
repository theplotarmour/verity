-- ---------------------------------------------------------------------------
-- Paid now, or owed — instead of a credit approval
--
-- Requested: "remove the approve credit system. If a sales order is made, give
-- the option of is the payment already made or will it be made later on, if so
-- then it is updated in who owes what."
--
-- The credit gate held an order in `pending_credit` when it took a customer past
-- their limit, and somebody with authority had to approve it before anything
-- could happen. For a yard where the proprietor is the person taking the order,
-- that is a step they perform on themselves.
--
-- What replaces it is the question that actually gets asked across the counter:
-- has this been paid, or is it on account. Prepaid orders settle themselves
-- when the invoice is raised; the rest appear on Who owes what, which is where
-- the merchant looks for them.
--
-- The credit LIMIT is not deleted. It still shows exposure and headroom on the
-- customer, so the figure is there to look at — it simply no longer blocks an
-- order. Removing the number as well would have thrown away information nobody
-- asked to lose.
--
-- Orders sitting in pending_credit are moved to approved: the gate they were
-- waiting at no longer exists, and leaving them behind it would strand them the
-- way the 'Processing' row was stranded.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_sales_order"
  ADD COLUMN "payment_terms" TEXT NOT NULL DEFAULT 'credit';

ALTER TABLE "plywood_sales_order"
  ADD CONSTRAINT "plywood_sales_order_payment_terms_known"
  CHECK ("payment_terms" IN ('prepaid', 'credit'));

UPDATE "plywood_sales_order" SET "state" = 'approved' WHERE "state" = 'pending_credit';
