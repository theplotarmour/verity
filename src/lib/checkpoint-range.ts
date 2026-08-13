/**
 * Ranged checkpoints.
 *
 * A MEASUREMENT checkpoint can carry a minimum, a maximum, or both. A reading
 * outside them is a fail regardless of what the operator ticked — the whole point
 * of writing the range down is that the judgement stops being a person's opinion
 * at the end of a long shift.
 *
 * Pure, because both the stage checklist and any future QC path have to apply the
 * same rule, and a second copy is a second answer to "is 9 out of range".
 */

export type CheckpointRange = { minValue?: number | null; maxValue?: number | null };

/** Whether the checkpoint has a range at all. Either bound alone counts. */
export function isRanged(range: CheckpointRange): boolean {
  return range.minValue !== null && range.minValue !== undefined
    ? true
    : range.maxValue !== null && range.maxValue !== undefined;
}

export type RangeVerdict =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Judge a reading against its bounds.
 *
 * Bounds are inclusive: a rule written "at or below 5°C" is the ordinary way food
 * safety states a limit, and treating 5 as a breach would fail every correctly
 * held fridge.
 *
 * An unparseable answer on a ranged checkpoint is a breach, not a pass. "about 6"
 * in a temperature field is exactly the reading somebody should look at.
 */
export function judgeReading(raw: string | null | undefined, range: CheckpointRange): RangeVerdict {
  if (!isRanged(range)) return { ok: true };

  // Emptiness is checked before Number(), because `Number("")` is 0 — a blank
  // answer would otherwise read as a perfectly good zero and pass any range with
  // a maximum above it.
  const text = String(raw ?? "").trim();
  const value = text === "" ? NaN : Number(text);
  if (!Number.isFinite(value)) {
    return { ok: false, reason: "needs a number to check against its range" };
  }

  const { minValue, maxValue } = range;
  if (minValue !== null && minValue !== undefined && value < minValue) {
    return { ok: false, reason: `${value} is below the minimum of ${minValue}` };
  }
  if (maxValue !== null && maxValue !== undefined && value > maxValue) {
    return { ok: false, reason: `${value} is above the maximum of ${maxValue}` };
  }
  return { ok: true };
}

/** Human range, for a hint or an error. */
export function describeRange(range: CheckpointRange): string {
  const { minValue: min, maxValue: max } = range;
  if (min !== null && min !== undefined && max !== null && max !== undefined) {
    return `${min}–${max}`;
  }
  if (min !== null && min !== undefined) return `at least ${min}`;
  if (max !== null && max !== undefined) return `at most ${max}`;
  return "";
}
