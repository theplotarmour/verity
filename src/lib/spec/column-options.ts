/**
 * What a "pick from a column of another category" dropdown should offer.
 *
 * The owner keeps his vehicles as one flat subcategory — Vehicle > Car — with
 * three pick-from-list columns on it:
 *
 *   Brand   | Model  | Generation
 *   --------|--------|-----------
 *   Tata    | Nexon  | 2017-2020
 *   Tata    | Nexon  | 2021-
 *   Maruti  | Swift  | 2012-2019
 *
 * A Seat Cover then adds three columns of its own, each linking to Car and
 * showing one of those columns. The whole point is that they must not be
 * independent lists: choosing Tata has to leave Nexon on offer and take Swift
 * away. Reading the columns separately gives the union — every model under
 * every brand — which is the mixing this exists to prevent.
 *
 * So the rows are the authority. A combination is offered only if some real row
 * carries it alongside everything already chosen, which means the list can only
 * ever describe vehicles the factory has actually recorded.
 */

/**
 * One record of the target category, as the answers it holds.
 *
 * Keyed by field id, valued by whatever identifies the answer — an option id
 * for a pick-from-list column, the text for a typed one. The caller decides
 * which; this only ever compares them.
 */
export type TargetRow = {
  itemId: string;
  values: Record<string, string | null | undefined>;
};

/** Columns already answered on the form, as field id -> chosen key. */
export type ColumnFilters = Record<string, string | null | undefined>;

/**
 * Rows that match every filter.
 *
 * A filter with no value is ignored rather than treated as "must be blank":
 * nothing is being narrowed until a choice is actually made.
 */
export function rowsMatching(rows: TargetRow[], filters: ColumnFilters): TargetRow[] {
  const active = Object.entries(filters).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (active.length === 0) return rows;
  return rows.filter((row) => active.every(([fieldId, want]) => row.values[fieldId] === want));
}

/**
 * The distinct keys a column takes across the rows still in play.
 *
 * Order follows first appearance, so the list is stable between reloads rather
 * than reshuffling as rows are added.
 */
export function columnKeys(
  rows: TargetRow[],
  fieldId: string,
  filters: ColumnFilters = {}
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  // A column never narrows itself: filtering by the answer we are about to
  // replace would leave exactly one choice, which is the current one.
  const { [fieldId]: _self, ...rest } = filters;
  for (const row of rowsMatching(rows, rest)) {
    const key = row.values[fieldId];
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * Whether a chosen key is still valid once the filters above it changed.
 *
 * Switching the brand from Tata to Maruti leaves Nexon selected underneath and
 * nothing on screen says it is now wrong. The caller uses this to clear it.
 */
export function isStillOffered(
  rows: TargetRow[],
  fieldId: string,
  chosen: string | null | undefined,
  filters: ColumnFilters
): boolean {
  if (!chosen) return true;
  return columnKeys(rows, fieldId, filters).includes(chosen);
}
