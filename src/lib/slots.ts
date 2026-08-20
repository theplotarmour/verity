/**
 * Bookable slots for one staff member on one day.
 *
 * Pure and free of Prisma so it can be tested against hand-written windows, and
 * so the portal page and the confirm action run the *same* rule. Two
 * implementations of "is 2pm free" is how a double booking happens: the grid
 * offers a slot the write path would have refused, or worse, the other way
 * round.
 *
 * The inputs are deliberately dumb — a working window, the appointments already
 * in it, and two durations — because everything interesting about a roster
 * (which shifts, whose, what date) belongs to the caller.
 */

export interface BookedRange {
  start: Date;
  end: Date;
}

export interface SlotRules {
  /** How long one appointment runs. */
  slotMinutes: number;
  /**
   * Dead time after each appointment: cleaning down a chair, resetting a room.
   * Applied to the *booked* ranges rather than to the grid, so a 15-minute
   * buffer blocks the slot after a booking without shifting every later slot
   * off the clock.
   */
  bufferMinutes: number;
}

export const DEFAULT_SLOT_RULES: SlotRules = { slotMinutes: 30, bufferMinutes: 0 };

/** Clamp the stored settings into something a grid can actually be built from. */
export function normaliseSlotRules(raw: unknown): SlotRules {
  const source = (raw ?? {}) as { slotMinutes?: unknown; bufferMinutes?: unknown };
  const slot = Number(source.slotMinutes);
  const buffer = Number(source.bufferMinutes);
  return {
    // 5 minutes is the shortest slot worth rendering; 8 hours the longest that
    // is still an appointment rather than a booking of the whole day.
    slotMinutes:
      Number.isFinite(slot) && slot >= 5 && slot <= 480
        ? Math.round(slot)
        : DEFAULT_SLOT_RULES.slotMinutes,
    bufferMinutes:
      Number.isFinite(buffer) && buffer >= 0 && buffer <= 240
        ? Math.round(buffer)
        : DEFAULT_SLOT_RULES.bufferMinutes,
  };
}

/**
 * "08:00" on a given UTC-midnight day key, as an instant.
 *
 * Shift times are stored as wall-clock strings and the business runs in IST, so
 * the offset is applied here rather than by whoever reads a Shift. Returns null
 * on anything that is not HH:MM, because a malformed shift should drop out of
 * the grid rather than produce an Invalid Date that compares false against
 * everything and silently offers the whole day.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function istWallClock(dayKey: string, hhmm: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm?.trim() ?? "");
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hours, minutes) - IST_OFFSET_MS);
}

/**
 * Every free slot start in `[windowStart, windowEnd)`.
 *
 * A slot is offered when the whole appointment fits inside the window and
 * overlaps nothing already booked, once each booking is extended by the buffer.
 * `notBefore` drops slots that have already passed — a portal showing this
 * morning's 9am at 11am is offering a booking nobody can honour.
 */
export function freeSlots(
  windowStart: Date,
  windowEnd: Date,
  booked: BookedRange[],
  rules: SlotRules,
  notBefore: Date = new Date(),
): Date[] {
  const slotMs = rules.slotMinutes * 60_000;
  const bufferMs = rules.bufferMinutes * 60_000;
  if (slotMs <= 0) return [];

  const blocked = booked.map((b) => ({
    start: b.start.getTime(),
    end: b.end.getTime() + bufferMs,
  }));

  const out: Date[] = [];
  for (let t = windowStart.getTime(); t + slotMs <= windowEnd.getTime(); t += slotMs) {
    if (t < notBefore.getTime()) continue;
    const end = t + slotMs;
    const clash = blocked.some((b) => t < b.end && end > b.start);
    if (!clash) out.push(new Date(t));
  }
  return out;
}

/** Whether one proposed range is still free. The write path's version of the grid. */
export function isSlotFree(
  start: Date,
  end: Date,
  booked: BookedRange[],
  rules: SlotRules,
): boolean {
  const bufferMs = rules.bufferMinutes * 60_000;
  return !booked.some(
    (b) => start.getTime() < b.end.getTime() + bufferMs && end.getTime() > b.start.getTime(),
  );
}
