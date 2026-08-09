import type { SpecAnswer } from "./types";

/**
 * The storage identity of one answer — what the hash consumes. Always an id or
 * a raw value, never a display label, so renaming a fabric does not change the
 * identity of every item that references it.
 *
 * Lives apart from the create action because the variant grid needs to compute
 * hashes for rows that have not been saved, and a "use server" module can only
 * export async functions.
 */
export function identityOf(a: SpecAnswer): string {
  if (a.optionId) return a.optionId;
  if (a.valueItemId) return a.valueItemId;
  if (a.valueRefId) return a.valueRefId;
  if (a.valueNumber !== null && a.valueNumber !== undefined) return String(a.valueNumber);
  if (a.valueBool !== null && a.valueBool !== undefined) return String(a.valueBool);
  return a.valueText ?? "";
}

/** True when an answer carries nothing — the wizard's "not filled in" state. */
export function isEmptyAnswer(a: SpecAnswer | undefined): boolean {
  if (!a) return true;
  return identityOf(a) === "";
}
