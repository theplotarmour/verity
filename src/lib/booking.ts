import type { AppointmentStatus } from "@prisma/client";

/**
 * Booking constants and pure helpers.
 *
 * A plain module because `server/actions/booking.ts` is `"use server"`, where only
 * async functions may be exported. The UI, the actions and the tests all need the
 * same status list and the same day/week windows, so they live here once.
 */

/** The statuses in the order they progress. Drives the filter pills. */
export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

/** Statuses that still occupy the book — what "today's schedule" counts. */
export const LIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

/**
 * The half-open [start, end) instant window for the IST calendar day containing
 * `on`. Reuses the dining module's IST flooring rather than restating the offset
 * — one timezone helper, not two that drift.
 */
export function bookingDayRange(on: Date = new Date()): { start: Date; end: Date } {
  const start = istDayStart(on);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * The seven-day window starting at the IST midnight of `on`. The calendar's week
 * view scans exactly this range.
 */
export function bookingWeekRange(on: Date = new Date()): { start: Date; end: Date } {
  const start = istDayStart(on);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Minutes between two instants, floored at zero. */
export function slotMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

/**
 * Midnight tonight-just-gone, in IST, as a UTC instant.
 *
 * The server clock is UTC and the business is not. Without this, "today's book"
 * rolls over at 05:30 local — in the middle of a working morning, splitting one
 * day's appointments across two.
 *
 * ponytail: IST is hardcoded because every tenant is in India. Upgrade path is a
 * timezone on Factory, read here, the moment one is not.
 */
export function istDayStart(now: Date = new Date()): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  // Floor to the IST calendar day, then convert the instant back to UTC.
  const istMidnight = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return new Date(istMidnight - IST_OFFSET_MS);
}
