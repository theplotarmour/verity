-- Phase 1, step 2: copy SalesOrder's automotive columns into dynamicData.
--
-- Additive and idempotent. Nothing is dropped and no application behaviour
-- changes when this runs, because the accessor
-- (src/platform/product/orderFields.ts) still prefers the columns until
-- PREFER_DYNAMIC is flipped.
--
-- Deploy sequence:
--   1. Ship the accessor and migrate call sites to it.   (no behaviour change)
--   2. Apply this migration.                             (no behaviour change)
--   3. Verify parity, then flip PREFER_DYNAMIC to true.  (one-line, reversible)
--   4. Only then drop the columns, in a later migration.
--
-- Steps 3 and 4 are deliberately separate: step 3 is reversible in seconds,
-- step 4 is not reversible at all.

UPDATE "SalesOrder"
SET "dynamicData" = COALESCE("dynamicData", '{}'::jsonb) || jsonb_strip_nulls(
    jsonb_build_object(
        'vehicle_brand_id', "vehicleBrandId",
        'vehicle_model_id', "vehicleModelId",
        'vehicle_year',     "vehicleYear",
        'seat_type',        "seatType",
        'headrests',        "headrestCount"
    )
)
-- `armrest` is set separately: it is a NOT NULL boolean defaulting to false,
-- so jsonb_strip_nulls would never remove it, and folding it into the object
-- above would write `false` for every non-seat order that has no armrest
-- concept at all. Only orders that actually have it set carry the key.
|| CASE WHEN "hasArmrest" THEN jsonb_build_object('armrest', true) ELSE '{}'::jsonb END
WHERE "vehicleBrandId" IS NOT NULL
   OR "vehicleModelId" IS NOT NULL
   OR "vehicleYear" IS NOT NULL
   OR "seatType" IS NOT NULL
   OR "headrestCount" IS NOT NULL
   OR "hasArmrest" = true;

-- Verification query for step 3. Must return zero rows before flipping.
--
--   SELECT "id", "soNumber"
--   FROM "SalesOrder"
--   WHERE ("vehicleBrandId" IS NOT NULL
--          AND "dynamicData"->>'vehicle_brand_id' IS DISTINCT FROM "vehicleBrandId")
--      OR ("seatType" IS NOT NULL
--          AND "dynamicData"->>'seat_type' IS DISTINCT FROM "seatType")
--      OR ("headrestCount" IS NOT NULL
--          AND ("dynamicData"->>'headrests')::int IS DISTINCT FROM "headrestCount");
