/**
 * Menu constants and named blockers.
 *
 * A plain module because `server/actions/menu.ts` is `"use server"`, where only
 * async functions may be exported — and because a UI that wants to branch on *why*
 * a delete was refused needs the same names the server used.
 */

/**
 * Why a menu delete was refused.
 *
 * A named blocker rather than a matched error string: the message is written for a
 * restaurant manager and will be rewritten, translated and shortened, and a UI that
 * branches on its text breaks the first time somebody improves the wording.
 */
export const MENU_BLOCKERS = {
  CATEGORY_HAS_ITEMS: "CATEGORY_HAS_ITEMS",
} as const;

export type MenuBlocker = (typeof MENU_BLOCKERS)[keyof typeof MENU_BLOCKERS];

/** Paise → "₹249". Display only; never parse it back. */
export function formatMenuPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
