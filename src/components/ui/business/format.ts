/**
 * How money, quantity and dates are written across every business screen.
 *
 * These were ten separate copies of `rupees` in ten page components, and copies
 * drift: one rounded, one truncated, one used the browser's default locale. The
 * target flow's whole premise is that a number means the same thing wherever it
 * appears (§8, §71), and a figure that renders differently on two screens is
 * that premise failing in the smallest possible way.
 *
 * Money is stored in paise and never in a float. Everything here takes paise.
 */

/**
 * `₹1,23,456` — Indian digit grouping, whole rupees.
 *
 * Rounded rather than truncated: a balance of 99 paise reads as ₹1, and showing
 * ₹0 for money that exists is worse than showing a rupee that is 1 paisa
 * generous. Paise are never displayed because no plywood price is quoted in
 * them; the stored value keeps them, so nothing is lost.
 */
export function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * The same figure abbreviated for a dashboard tile — `₹18.4L`, `₹1.2Cr`.
 *
 * Lakh and crore, not million: the reader is an Indian board trader and their
 * own arithmetic is in lakhs. Below a lakh the exact figure is shorter than its
 * abbreviation, so it is not abbreviated.
 */
export function rupeesShort(paise: number): string {
  const rupeeValue = Math.round(paise / 100);
  const sign = rupeeValue < 0 ? "-" : "";
  const magnitude = Math.abs(rupeeValue);
  if (magnitude >= 10_000_000) return `${sign}₹${(magnitude / 10_000_000).toFixed(2)}Cr`;
  if (magnitude >= 100_000) return `${sign}₹${(magnitude / 100_000).toFixed(1)}L`;
  return `${sign}₹${magnitude.toLocaleString("en-IN")}`;
}

/** `40 sheets` — plywood is counted in sheets, and "units" is nobody's word. */
export function sheets(units: number): string {
  return `${units.toLocaleString("en-IN")} ${units === 1 ? "sheet" : "sheets"}`;
}

/**
 * `30 Aug 2026`. Explicit and unambiguous — 08/09 is two different days
 * depending on which side of the Atlantic reads it, and a GST return is not the
 * place to find that out.
 */
export function day(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Whole days since an instant, or null. Used for ageing, never for display. */
export function daysSince(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const then = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((Date.now() - then.getTime()) / 86_400_000);
}
