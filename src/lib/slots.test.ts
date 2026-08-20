import { describe, it, expect } from "vitest";

import {
  DEFAULT_SLOT_RULES,
  freeSlots,
  isSlotFree,
  istWallClock,
  normaliseSlotRules,
} from "./slots";

/**
 * The booking grid's arithmetic.
 *
 * This is the file that stops a double booking. The portal draws its grid from
 * `freeSlots` and the write path re-checks with `isSlotFree`, so the two have to
 * agree about what "taken" means — including the buffer, which is the part most
 * likely to drift.
 */

const at = (hhmm: string) => istWallClock("2026-03-05", hhmm)!;

describe("istWallClock", () => {
  it("reads a shift time as IST rather than as server-local time", () => {
    // 09:00 IST is 03:30 UTC. Getting this wrong shifts every slot by 5.5
    // hours, which reads as "the shop opens at half three in the morning".
    expect(at("09:00").toISOString()).toBe("2026-03-05T03:30:00.000Z");
  });

  it("refuses anything that is not a wall-clock time", () => {
    // A malformed shift has to drop out of the grid. An Invalid Date compares
    // false against everything, which would silently offer the whole day.
    expect(istWallClock("2026-03-05", "9am")).toBeNull();
    expect(istWallClock("2026-03-05", "25:00")).toBeNull();
    expect(istWallClock("2026-03-05", "09:61")).toBeNull();
    expect(istWallClock("not-a-day", "09:00")).toBeNull();
  });
});

describe("normaliseSlotRules", () => {
  it("falls back when a tenant has configured nothing", () => {
    expect(normaliseSlotRules(undefined)).toEqual(DEFAULT_SLOT_RULES);
    expect(normaliseSlotRules({})).toEqual(DEFAULT_SLOT_RULES);
  });

  it("clamps values that would make a grid impossible", () => {
    // A zero or negative slot length loops forever or renders nothing; a
    // day-long slot is not an appointment. Both fall back rather than throwing,
    // because a portal must still render for a tenant with a bad setting.
    expect(normaliseSlotRules({ slotMinutes: 0 }).slotMinutes).toBe(30);
    expect(normaliseSlotRules({ slotMinutes: -15 }).slotMinutes).toBe(30);
    expect(normaliseSlotRules({ slotMinutes: 4 }).slotMinutes).toBe(30);
    expect(normaliseSlotRules({ slotMinutes: 10_000 }).slotMinutes).toBe(30);
    expect(normaliseSlotRules({ bufferMinutes: -5 }).bufferMinutes).toBe(0);
  });

  it("takes a sensible configured value", () => {
    expect(normaliseSlotRules({ slotMinutes: 45, bufferMinutes: 15 })).toEqual({
      slotMinutes: 45,
      bufferMinutes: 15,
    });
  });
});

describe("freeSlots", () => {
  const rules = { slotMinutes: 30, bufferMinutes: 0 };
  // Well before the window, so "already passed" never enters these cases.
  const past = new Date("2026-03-01T00:00:00Z");

  it("fills an empty window and stops before it overruns", () => {
    const slots = freeSlots(at("09:00"), at("11:00"), [], rules, past);
    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-03-05T03:30:00.000Z",
      "2026-03-05T04:00:00.000Z",
      "2026-03-05T04:30:00.000Z",
      "2026-03-05T05:00:00.000Z",
    ]);
  });

  it("never offers a slot that would run past the end of the shift", () => {
    // 09:00–09:50 holds one 30-minute slot, not two: the second would end at
    // 10:00, twenty minutes after the person goes home.
    const slots = freeSlots(at("09:00"), at("09:50"), [], rules, past);
    expect(slots).toHaveLength(1);
  });

  it("drops a slot an appointment already covers", () => {
    const slots = freeSlots(
      at("09:00"),
      at("11:00"),
      [{ start: at("09:30"), end: at("10:00") }],
      rules,
      past,
    );
    expect(slots.map((s) => s.toISOString())).not.toContain("2026-03-05T04:00:00.000Z");
    expect(slots).toHaveLength(3);
  });

  it("blocks the slot after a booking when a buffer is set", () => {
    // The failure this exists for: a 15-minute cleaning gap that the grid
    // ignores, so the next customer is booked into the chair being wiped down.
    const withBuffer = freeSlots(
      at("09:00"),
      at("11:00"),
      [{ start: at("09:00"), end: at("09:30") }],
      { slotMinutes: 30, bufferMinutes: 15 },
      past,
    );
    // 09:30 is inside the buffer; the day resumes at 10:00.
    expect(withBuffer.map((s) => s.toISOString())).toEqual([
      "2026-03-05T04:30:00.000Z",
      "2026-03-05T05:00:00.000Z",
    ]);
  });

  it("hides slots that have already gone", () => {
    // A portal offering this morning's 09:00 at 11:00 is offering a booking
    // nobody can honour.
    const slots = freeSlots(at("09:00"), at("11:00"), [], rules, at("10:00"));
    expect(slots.map((s) => s.toISOString())).toEqual([
      "2026-03-05T04:30:00.000Z",
      "2026-03-05T05:00:00.000Z",
    ]);
  });
});

describe("isSlotFree", () => {
  const rules = { slotMinutes: 30, bufferMinutes: 15 };

  it("agrees with the grid about the buffer", () => {
    // The write path and the grid must not disagree: if freeSlots hid 09:30,
    // isSlotFree has to refuse it too, or the confirm button books over it.
    const booked = [{ start: at("09:00"), end: at("09:30") }];
    expect(isSlotFree(at("09:30"), at("10:00"), booked, rules)).toBe(false);
    expect(isSlotFree(at("10:00"), at("10:30"), booked, rules)).toBe(true);
  });

  it("allows a slot that ends exactly where a booking begins", () => {
    // Touching is not overlapping. Refusing this loses a bookable slot before
    // every appointment in the day.
    const booked = [{ start: at("10:00"), end: at("10:30") }];
    expect(isSlotFree(at("09:30"), at("10:00"), booked, { ...rules, bufferMinutes: 0 })).toBe(true);
  });
});
