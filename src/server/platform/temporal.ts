import "server-only";
import type { TenantScopedClient } from "./tenancy";

/**
 * Temporal model.
 *
 * Authority: EXE-SCH-001 (UTC storage with user-local translation), Bible V4
 * §5.B (schedulers read time in local project contexts), Bible V3 §1 (SLA
 * clocks reckon against working hours).
 *
 * Every instant is stored in UTC and rendered in a zone. The zone is resolved,
 * never assumed: an organization's own zone, else its tenant's, else UTC stated
 * explicitly. A silent default is the failure this model exists to prevent —
 * guessing puts every deadline out by the offset and nothing in the interface
 * reveals it.
 */

/** The zone an organization reckons in. Never null; UTC is explicit. */
export async function effectiveTimeZone(
  tx: TenantScopedClient,
  organizationId: string,
): Promise<string> {
  const rows = await tx.$queryRaw<{ effective_time_zone: string | null }[]>`
    SELECT verity.effective_time_zone(${organizationId}::uuid)`;
  return rows[0]?.effective_time_zone ?? "UTC";
}

/** True when the zone is one the database recognises. */
export async function isValidTimeZone(
  tx: TenantScopedClient,
  zone: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ is_valid_timezone: boolean }[]>`
    SELECT verity.is_valid_timezone(${zone})`;
  return rows[0]?.is_valid_timezone ?? false;
}

/**
 * Formats an instant in a zone for display.
 *
 * Uses Intl rather than manual offset arithmetic, so daylight saving is handled
 * by the platform's own tz database instead of by an offset that is wrong for
 * half the year.
 */
export function formatInZone(
  instant: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(instant);
}

/** The zone abbreviation, so a rendered time can say which clock it is on. */
export function zoneLabel(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(instant);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}

/**
 * Working minutes between two instants under a calendar.
 *
 * With no calendar this is elapsed wall-clock time. With one, only declared
 * working windows count and holidays are excluded — so a request raised at
 * 17:00 on Friday against an eight-hour target is not breached by Monday
 * morning, which is the entire reason business calendars exist.
 */
export async function workingMinutesBetween(
  tx: TenantScopedClient,
  calendarId: string | null,
  from: Date,
  to: Date,
): Promise<number> {
  if (!calendarId) {
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000));
  }
  const rows = await tx.$queryRaw<{ working_minutes_between: number }[]>`
    SELECT verity.working_minutes_between(${calendarId}::uuid, ${from}, ${to})`;
  return rows[0]?.working_minutes_between ?? 0;
}
