/**
 * Turning a `YYYY-MM` into the window a tax query wants.
 *
 * The queries take `from`/`to` ISO instants. A screen holds a period key. This
 * is the one conversion between them, so a page cannot invent its own and drift
 * from the month its heading claims.
 *
 * Built in UTC deliberately: the SERVER resolves the business zone when it is
 * given no window at all, and when it IS given one the caller is naming a
 * calendar month explicitly. Doing zone arithmetic in the browser as well would
 * be two clocks disagreeing — the shape of the very bug this pass fixed.
 */
export function monthWindow(periodKey: string): { from: string; to: string } {
  const [year, month] = periodKey.split("-").map(Number) as [number, number];
  return {
    from: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    to: new Date(Date.UTC(year, month, 1) - 1).toISOString(),
  };
}

/** `YYYY-MM` for an instant, read in UTC to match `monthWindow`. */
export function monthKeyOf(instant: Date): string {
  return `${instant.getUTCFullYear()}-${String(instant.getUTCMonth() + 1).padStart(2, "0")}`;
}
