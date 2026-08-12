/**
 * Notification constants.
 *
 * A plain module rather than a const in `notifications.ts`: that file is
 * `"use server"`, and only async functions may be exported from one. `tsc` is
 * happy with a const there — the build is what fails, and the message points at
 * the importer rather than the export.
 */

/**
 * How many unread rows the operational warnings queue shows.
 *
 * Ten is a queue you work through. A hundred is a wall you learn to scroll past,
 * which is how an alert surface stops being read at all.
 */
export const WARNINGS_QUEUE_LIMIT = 10;
