-- ---------------------------------------------------------------------------
-- Task 106 Phase 7 correction. `outreach_direction` is append-only by its own
-- 20260913100000 migration (SELECT + INSERT policies, reject_mutation
-- trigger), so `postCompanyDirection`'s "close the prior Active row" UPDATE
-- has matched zero rows since it shipped: every row still reads Active and
-- the stored column has never been true. Same class as Phase 5's check-in
-- review finding. The honest shape is derived: the current direction is the
-- latest posted; every earlier row is closed at the next row's posted_at.
-- Neither needs a column, so both go — a stored value nothing can maintain
-- is a lie waiting to be read.
-- ---------------------------------------------------------------------------
ALTER TABLE "outreach_direction" DROP COLUMN "status";
ALTER TABLE "outreach_direction" DROP COLUMN "closed_at";
