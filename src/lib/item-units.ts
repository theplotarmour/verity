/**
 * The one rule for an item's units, shared by everything that sets them.
 *
 * An item is stocked in one unit and optionally bought in another — fabric
 * arrives as rolls and is issued by the metre — with a factor saying how many
 * of the first are in one of the second.
 *
 * This lived only inside `setItemUnits`, which is reached from the data grid's
 * row expander, i.e. only after an item already exists. The Add wizard set the
 * stocking unit by writing `defaultUOM` straight onto the row, so it could
 * neither offer a purchase unit nor apply any of these checks. Two places
 * editing the same three columns to two different standards is the bug; the
 * rule lives here now and both call it.
 */

export type UnitInput = {
  primaryUOM: string;
  secondaryUOM?: string | null;
  factor?: number | null;
};

export type NormalisedUnits = {
  primaryUOM: string;
  /** Null whenever there is no second unit, which also clears the factor. */
  secondaryUOM: string | null;
  factor: number | null;
};

/**
 * Units are stored upper-cased so "mtr", "Mtr" and "MTR" are one unit rather
 * than three that look identical in a dropdown and never match each other.
 */
export function normaliseUnit(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim().toUpperCase();
  return trimmed || null;
}

/**
 * Check and tidy a set of units, or say what is wrong in the owner's words.
 *
 * A half-defined conversion is refused rather than stored: a secondary unit
 * with no factor would make a goods receipt silently add the wrong quantity to
 * stock, and that error compounds through every issue and every valuation
 * after it.
 */
export function normaliseUnits(
  input: UnitInput
): { ok: true; units: NormalisedUnits } | { ok: false; error: string } {
  const primaryUOM = normaliseUnit(input.primaryUOM);
  if (!primaryUOM) return { ok: false, error: "A stocking unit is required" };

  const secondaryUOM = normaliseUnit(input.secondaryUOM);
  if (!secondaryUOM) {
    // No second unit means no conversion, whatever a factor was left over from
    // an earlier edit — otherwise clearing the unit leaves a rule behind it.
    return { ok: true, units: { primaryUOM, secondaryUOM: null, factor: null } };
  }

  if (secondaryUOM === primaryUOM) {
    return { ok: false, error: "The purchase unit must differ from the stocking unit" };
  }

  const factor = input.factor ?? null;
  if (factor === null || !Number.isFinite(factor) || factor <= 0) {
    return { ok: false, error: `How many ${primaryUOM} are in one ${secondaryUOM}?` };
  }

  return { ok: true, units: { primaryUOM, secondaryUOM, factor } };
}
