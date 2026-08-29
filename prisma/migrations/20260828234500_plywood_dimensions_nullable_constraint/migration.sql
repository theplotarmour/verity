-- ---------------------------------------------------------------------------
-- Explicit nullable-but-positive dimensions (Shri Ganesh Timber upgrade).
--
-- The prior migration (20260828234406) dropped NOT NULL from
-- thickness_tenth_mm/width_mm/height_mm via `prisma migrate dev`'s own
-- schema diff, but Prisma does not track hand-written CHECK constraints, so
-- plywood_product_dimensions_positive was left untouched:
--
--   CHECK (thickness_tenth_mm > 0 AND width_mm > 0 AND height_mm > 0)
--
-- Postgres's three-valued CHECK logic happens to still accept NULL here (a
-- NULL comparison propagates NULL rather than FALSE through AND, and only
-- FALSE fails a CHECK) — but relying on that is relying on an accident of
-- NULL algebra, not a stated rule. Replaced with the explicit form already
-- proven on sheet_weight_grams in the same table: NULL is allowed, zero and
-- negative are not, and a reader does not have to work out three-valued
-- logic to see that.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_product" DROP CONSTRAINT "plywood_product_dimensions_positive";
ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_dimensions_positive"
  CHECK (
    (thickness_tenth_mm IS NULL OR thickness_tenth_mm > 0) AND
    (width_mm IS NULL OR width_mm > 0) AND
    (height_mm IS NULL OR height_mm > 0)
  );
