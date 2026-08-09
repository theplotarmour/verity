/**
 * Deciding which slot a column-picked answer belongs in.
 *
 * A reference pointed at one column of another category can resolve to three
 * different things, and two of them are opaque cuids: an option id and an item
 * id look identical. The form used to decide by looking the id up in the
 * dropdown's visible list — but that list is filtered as the owner narrows and
 * emptied outright while a dependent field waits on its parent, so a ticked
 * value routinely outlived the list it came from. The lookup missed, and the
 * raw id was stored as if it were text the owner had typed: an item named
 * "cmsarwnx50001jw04kdv52frt DB 5".
 *
 * So the client says "here is a key, you work out what it is", and this decides
 * it against what the database actually holds. A guess is never made — an id
 * that matches nothing stays text, because that is the only remaining
 * possibility for a column the owner types into freely.
 */

export type RefileTarget = {
  /** Option ids belonging to the column being picked from. */
  optionIds: ReadonlySet<string>;
  /** Item ids in the target category. */
  itemIds: ReadonlySet<string>;
};

export type RefiledAnswer =
  | { optionId: string }
  | { valueItemId: string }
  | { valueText: string };

/**
 * Place one key in the slot the database says it belongs in.
 *
 * Options are checked before items: a column that offers a list is the common
 * case, and an id can only ever be one or the other.
 */
export function refileRefKey(key: string, target: RefileTarget): RefiledAnswer {
  if (target.optionIds.has(key)) return { optionId: key };
  if (target.itemIds.has(key)) return { valueItemId: key };
  return { valueText: key };
}

/**
 * Whether an answer still needs deciding.
 *
 * Answers that already name their slot are left alone — only `refKey` is the
 * client admitting it could not tell.
 */
export function needsRefiling(answer: {
  refKey?: string | null;
  optionId?: string | null;
  valueItemId?: string | null;
}): answer is { refKey: string } {
  return Boolean(answer.refKey && !answer.optionId && !answer.valueItemId);
}
