-- ---------------------------------------------------------------------------
-- Four product families, each quoted in its own unit.
--
-- The client trades boards, plywood, laminates and louvres. Boards and plywood
-- are sized in feet with a thickness in millimetres; laminates come in one size
-- only (8 ft x 4 ft); louvres are sized in inches. A single millimetre column
-- could not hold that honestly: 8 ft is 2438.4 mm, so storing feet as
-- millimetres would round a stated fact.
--
-- So the pair of dimension columns becomes "tenths of a declared unit", and the
-- unit travels with the row. Existing rows genuinely hold millimetres and are
-- migrated as millimetres — width_mm 2440 becomes width_tenth 24400 with
-- size_unit 'MM'. They are not silently reinterpreted as feet.
-- ---------------------------------------------------------------------------

ALTER TABLE "plywood_product"
  ADD COLUMN "category"     TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "size_unit"    TEXT NOT NULL DEFAULT 'MM',
  ADD COLUMN "width_tenth"  INTEGER,
  ADD COLUMN "height_tenth" INTEGER;

-- Every row that exists today was entered as a board, in millimetres.
UPDATE "plywood_product"
   SET "width_tenth"  = "width_mm"  * 10,
       "height_tenth" = "height_mm" * 10,
       "category"     = 'BOARD';

-- The old constraint names the columns about to disappear, so it goes first.
ALTER TABLE "plywood_product" DROP CONSTRAINT "plywood_product_dimensions_positive";
ALTER TABLE "plywood_product" DROP COLUMN "width_mm", DROP COLUMN "height_mm";

ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_dimensions_positive"
  CHECK (
    (thickness_tenth_mm IS NULL OR thickness_tenth_mm > 0) AND
    (width_tenth  IS NULL OR width_tenth  > 0) AND
    (height_tenth IS NULL OR height_tenth > 0)
  );

-- A category outside this set would reach the screen with no unit and no rules.
ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_category_known"
  CHECK ("category" IN ('BOARD', 'PLYWOOD', 'LAMINATE', 'LOUVRE', 'OTHER'));

ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_size_unit_known"
  CHECK ("size_unit" IN ('MM', 'FT', 'IN'));

-- A laminate is 8 ft x 4 ft and nothing else — the client sells one size. The
-- command layer sets it, and this refuses anything that arrives by another
-- route. 80 and 40 are tenths of a foot.
ALTER TABLE "plywood_product" ADD CONSTRAINT "plywood_product_laminate_is_eight_by_four"
  CHECK (
    "category" <> 'LAMINATE'
    OR ("width_tenth" = 80 AND "height_tenth" = 40 AND "size_unit" = 'FT')
  );
