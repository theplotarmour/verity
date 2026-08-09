import type { SpecAnswer } from "./types";

/** A field the owner switched to multi-select, with every value they ticked. */
export type MultiSelection = {
  key: string;
  answers: SpecAnswer[];
};

export type CombinationResult = {
  /** One complete answer set per combination, ready for createItemFromSpec. */
  rows: Record<string, SpecAnswer>[];
  /** How many combinations the selection describes, before any cap. */
  total: number;
  /** True when `total` exceeded the cap and no rows were built. */
  capped: boolean;
};

/**
 * The most SKUs one wizard pass will build.
 *
 * Three multi fields with ten values each is a thousand items. Generating them
 * silently is a worse outcome than refusing: the owner asked for a few dozen
 * real variants, not the whole cartesian product, and undoing a thousand rows
 * is far more work than narrowing one field.
 */
export const COMBINATION_CAP = 200;

/**
 * Expand fixed answers plus multi-selected fields into one answer set per
 * combination.
 *
 * Multi fields with nothing ticked are skipped rather than collapsing the whole
 * product to zero — an untouched multi field means "not answered", exactly as
 * it does in single mode.
 *
 * Order is stable: the last multi field varies fastest, so the grid reads like
 * an odometer and a row keeps its position while the owner ticks others.
 */
export function expandCombinations(
  fixed: Record<string, SpecAnswer>,
  multi: MultiSelection[],
  cap: number = COMBINATION_CAP
): CombinationResult {
  const active = multi.filter((m) => m.answers.length > 0);

  const total = active.reduce((n, m) => n * m.answers.length, 1);
  if (total > cap) return { rows: [], total, capped: true };

  let rows: Record<string, SpecAnswer>[] = [{ ...fixed }];
  for (const field of active) {
    const next: Record<string, SpecAnswer>[] = [];
    for (const row of rows) {
      for (const answer of field.answers) {
        next.push({ ...row, [field.key]: answer });
      }
    }
    rows = next;
  }

  return { rows, total, capped: false };
}

/**
 * Which field to narrow when the cap is hit.
 *
 * Naming the widest field turns "too many combinations" into a single obvious
 * action instead of a hunt.
 */
export function widestSelection(multi: MultiSelection[]): MultiSelection | null {
  let widest: MultiSelection | null = null;
  for (const m of multi) {
    if (!widest || m.answers.length > widest.answers.length) widest = m;
  }
  return widest && widest.answers.length > 1 ? widest : null;
}
