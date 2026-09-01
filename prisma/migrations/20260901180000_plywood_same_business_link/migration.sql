-- ---------------------------------------------------------------------------
-- One business, both sides of the trade
--
-- Reported: "the suppliers can be our customers as well."
--
-- A plywood merchant routinely buys from and sells to the same firm — a mill
-- that also takes offcuts back, a dealer who supplies one grade and orders
-- another. That is one relationship and one conversation about money, and it
-- was two unrelated rows carrying two unrelated balances, so nobody could
-- answer "where do we stand with them" without doing arithmetic on two screens.
--
-- A LINK, NOT A MERGE, deliberately. Buying and selling remain separate
-- documents with separate tax treatment (their GSTIN is the supplier on one and
-- the recipient on the other), separate credit limits, and separate ledgers,
-- because they are separate obligations. Netting them by default would let a
-- receivable hide a debt, and a business that offsets what it owes against what
-- it is owed without saying so has misstated both. What the link buys is that
-- the two are shown together, and their net position can be stated when
-- somebody asks for it.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_supplier"
  ADD COLUMN "linked_customer_id" UUID;

-- One customer is the same business as at most one supplier. Without this two
-- suppliers could both claim the same customer and "their net position" would
-- have two answers.
CREATE UNIQUE INDEX "plywood_supplier_linked_customer_id_key"
  ON "plywood_supplier"("tenant_id", "linked_customer_id")
  WHERE "linked_customer_id" IS NOT NULL;

ALTER TABLE "plywood_supplier"
  ADD CONSTRAINT "plywood_supplier_linked_customer_id_fkey"
  FOREIGN KEY ("tenant_id", "linked_customer_id")
  REFERENCES "plywood_customer"("tenant_id", "id") ON DELETE SET NULL ON UPDATE NO ACTION;
