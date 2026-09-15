/**
 * The Core view's time selector (2026-09-13 doc §4: "Today | This Week |
 * This Month"), turned into the `from`/`to` window every Phase 7 roll-up
 * query accepts. One conversion, shared by the Outreach and Intelligence
 * pages, so the two screens cannot disagree about what "this week" is.
 *
 * Day boundaries are the TENANT's, not the server's: PlotArmour works in
 * Asia/Kolkata and a "today" that flips at 05:30 IST would be wrong exactly
 * when the morning check-in review happens.
 */
export const RANGES = ["today", "week", "month", "all"] as const;
export type RangeKey = (typeof RANGES)[number];

export const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  all: "All time",
};

export function rangeFromParam(value: string | undefined, fallback: RangeKey = "week"): RangeKey {
  return (RANGES as readonly string[]).includes(value ?? "") ? (value as RangeKey) : fallback;
}

function partsIn(at: Date, zone: string): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), weekday };
}

function offsetMs(at: Date, zone: string): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const get = (type: string) => Number(p.find((x) => x.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

function localMidnight(zone: string, year: number, month: number, day: number): Date {
  const naive = Date.UTC(year, month - 1, day);
  const firstPass = naive - offsetMs(new Date(naive), zone);
  return new Date(naive - offsetMs(new Date(firstPass), zone));
}

/** `from` inclusive, `to` exclusive, as ISO instants — or `{}` for all time. */
export function windowFor(range: RangeKey, zone: string, at: Date = new Date()): { from?: string; to?: string } {
  if (range === "all") return {};
  const { year, month, day, weekday } = partsIn(at, zone);
  const today = localMidnight(zone, year, month, day);
  const tomorrow = localMidnight(zone, year, month, day + 1);
  if (range === "today") return { from: today.toISOString(), to: tomorrow.toISOString() };
  if (range === "week") {
    // Monday-start, the handbook's own reporting week.
    const back = (weekday + 6) % 7;
    return { from: localMidnight(zone, year, month, day - back).toISOString(), to: tomorrow.toISOString() };
  }
  return { from: localMidnight(zone, year, month, 1).toISOString(), to: tomorrow.toISOString() };
}

export function percent(rate: number | null): string {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}
