-- Catalogue fields for the B2C portals.
--
-- Product carried a valuation method and a tax rate but no sale price, because
-- nothing customer-facing read the table until now. `pricePaise` is an integer
-- in paise so booking, catalogue and invoice arithmetic share one convention
-- (Appointment.pricePaise already does).
--
-- `isPublished` is deliberately separate from `status`. Status is whether the
-- business still trades the item; published is whether a customer may see it.
-- A seasonal dish is ACTIVE and unpublished out of season, and a bolt of lining
-- fabric is ACTIVE and never published.
--
-- Both default safely: existing rows price at zero and stay out of the portal
-- until an owner publishes them deliberately.
ALTER TABLE "Product" ADD COLUMN "pricePaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- The portal's only query: everything one tenant publishes.
CREATE INDEX "Product_factoryId_isPublished_idx" ON "Product"("factoryId", "isPublished");
