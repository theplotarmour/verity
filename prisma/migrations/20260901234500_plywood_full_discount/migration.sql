-- ---------------------------------------------------------------------------
-- A discount may be 100%
--
-- Requested: "maximum discount set at 100%."
--
-- The original constraint stopped below 100 on the reasoning that a wholly
-- discounted line is a free supply — a different transaction with its own tax
-- treatment — rather than a very large discount. That reasoning is sound and it
-- is not this system's call to make: a merchant writes off a damaged sheet or
-- throws in a board to close a deal, and refusing to record what actually
-- happened does not make the transaction go away, it makes the record wrong.
--
-- So 100% is allowed and the consequence is stated rather than prevented: the
-- line's net price becomes zero, the invoice bills nothing for it, and a free
-- supply may still attract GST on its value under the GST Act. That is a
-- judgement for whoever files the return, and the line is visible to them.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_purchase_order_line"
  DROP CONSTRAINT "plywood_purchase_order_line_discount_range";
ALTER TABLE "plywood_purchase_order_line"
  ADD CONSTRAINT "plywood_purchase_order_line_discount_range"
  CHECK ("discount_bps" >= 0 AND "discount_bps" <= 10000);

ALTER TABLE "plywood_sales_order_line"
  DROP CONSTRAINT "plywood_sales_order_line_discount_range";
ALTER TABLE "plywood_sales_order_line"
  ADD CONSTRAINT "plywood_sales_order_line_discount_range"
  CHECK ("discount_bps" >= 0 AND "discount_bps" <= 10000);
