/**
 * Order field access during the Phase 1 migration.
 *
 * `SalesOrder` currently carries the automotive domain as first-class columns
 * (vehicleBrandId, vehicleModelId, vehicleYear, seatType, hasArmrest,
 * headrestCount) alongside a generic `dynamicData` JSON column. Roughly 47
 * files read those columns directly, including job cards, labels, QC review and
 * the customer-facing verification passport.
 *
 * Migrating all of them in one commit would be a large, unreviewable change
 * across the most business-critical paths in the product. So this module is the
 * seam:
 *
 *   1. Call sites move to `readOrderFields` / `writeOrderFields`. Behaviour is
 *      unchanged, because the accessor still prefers the legacy columns.
 *   2. A backfill copies the columns into dynamicData.
 *   3. `PREFER_DYNAMIC` flips. One line, one deploy, fully reversible.
 *   4. The columns are dropped and the legacy branch deleted.
 *
 * The point of the seam is that step 3 is a config change rather than a
 * 47-file rewrite, so it can be rolled back in seconds if a passport renders
 * wrong in production.
 */

import type { DescriptorValues } from "./descriptor";

/**
 * Whether to read from dynamicData in preference to the legacy columns.
 *
 * Stays false until the backfill has run and been verified. Flipping it before
 * then makes orders render with empty vehicle fields.
 */
export const PREFER_DYNAMIC = false;

/** The automotive columns as they exist on SalesOrder today. */
export interface LegacyOrderColumns {
  vehicleBrandId?: string | null;
  vehicleModelId?: string | null;
  vehicleYear?: string | null;
  seatType?: string | null;
  hasArmrest?: boolean | null;
  headrestCount?: number | null;
  dynamicData?: unknown;
}

/**
 * Canonical dynamicData keys for the automotive pack. These match the
 * ProductField.key values the automotive vertical defines, so a migrated order
 * and a natively-created one are indistinguishable.
 */
export const AUTOMOTIVE_KEYS = {
  brandId: "vehicle_brand_id",
  modelId: "vehicle_model_id",
  year: "vehicle_year",
  seatType: "seat_type",
  armrest: "armrest",
  headrests: "headrests",
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Read an order's configurable fields as generic descriptor values.
 *
 * Legacy columns win while PREFER_DYNAMIC is false. Note the fallback is
 * per-field rather than all-or-nothing: an order written after the backfill but
 * before the flip has both, and either source alone is complete.
 */
export function readOrderFields(order: LegacyOrderColumns): DescriptorValues {
  const dynamic = asRecord(order.dynamicData);

  const pick = <T>(dynamicKey: string, legacy: T | null | undefined): T | null => {
    const fromDynamic = dynamic[dynamicKey];
    if (PREFER_DYNAMIC) {
      if (fromDynamic !== undefined && fromDynamic !== null) return fromDynamic as T;
      return (legacy ?? null) as T | null;
    }
    if (legacy !== undefined && legacy !== null) return legacy;
    return (fromDynamic as T) ?? null;
  };

  return {
    ...dynamic,
    [AUTOMOTIVE_KEYS.brandId]: pick(AUTOMOTIVE_KEYS.brandId, order.vehicleBrandId),
    [AUTOMOTIVE_KEYS.modelId]: pick(AUTOMOTIVE_KEYS.modelId, order.vehicleModelId),
    [AUTOMOTIVE_KEYS.year]: pick(AUTOMOTIVE_KEYS.year, order.vehicleYear),
    [AUTOMOTIVE_KEYS.seatType]: pick(AUTOMOTIVE_KEYS.seatType, order.seatType),
    [AUTOMOTIVE_KEYS.armrest]: pick(AUTOMOTIVE_KEYS.armrest, order.hasArmrest),
    [AUTOMOTIVE_KEYS.headrests]: pick(AUTOMOTIVE_KEYS.headrests, order.headrestCount),
  };
}

/**
 * Build the write payload for an order's configurable fields.
 *
 * Dual-writes both representations for as long as the columns exist, so a
 * rollback of PREFER_DYNAMIC never encounters orders that only have one side
 * populated. Dropping the columns is what ends the dual write, and by then the
 * legacy branch is dead.
 */
export function writeOrderFields(
  values: DescriptorValues,
  existingDynamic?: unknown,
): LegacyOrderColumns & { dynamicData: Record<string, unknown> } {
  const merged = { ...asRecord(existingDynamic), ...values };

  const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
  const num = (v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    dynamicData: merged as Record<string, unknown>,
    vehicleBrandId: str(values[AUTOMOTIVE_KEYS.brandId]),
    vehicleModelId: str(values[AUTOMOTIVE_KEYS.modelId]),
    vehicleYear: str(values[AUTOMOTIVE_KEYS.year]),
    seatType: str(values[AUTOMOTIVE_KEYS.seatType]),
    hasArmrest: Boolean(values[AUTOMOTIVE_KEYS.armrest]),
    headrestCount: num(values[AUTOMOTIVE_KEYS.headrests]),
  };
}
