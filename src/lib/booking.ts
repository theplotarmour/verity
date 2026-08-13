import type { AppointmentStatus } from "@prisma/client";
import { istDayStart } from "./dining";

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
