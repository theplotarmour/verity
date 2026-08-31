import { describe, expect, it } from "vitest";
import {
  businessPeriodKey,
  businessPeriodWindow,
  startOfBusinessDay,
  startOfBusinessMonth,
} from "./clock";

/**
 * Audit finding U0-3. These assert the exact situation that was observed: a
 * tenant reckoning in Asia/Kolkata, read at 01:55 IST on 1 September, was told
 * it was August.
 */
describe("business-zone period boundaries (U0-3)", () => {
  // 2026-08-31T20:25Z is 2026-09-01T01:55 in IST — the instant from the audit.
  const earlyOnTheFirst = new Date("2026-08-31T20:25:00Z");

  it("names the month the business is actually in, not UTC's", () => {
    expect(businessPeriodKey("Asia/Kolkata", earlyOnTheFirst)).toBe("2026-09");
    // The bug it replaces, kept visible: UTC still says August at that instant.
    expect(businessPeriodKey("UTC", earlyOnTheFirst)).toBe("2026-08");
  });

  it("starts the business day at local midnight, not 05:30", () => {
    const dayStart = startOfBusinessDay("Asia/Kolkata", earlyOnTheFirst);
    // 00:00 IST on 1 Sep is 18:30Z on 31 Aug.
    expect(dayStart.toISOString()).toBe("2026-08-31T18:30:00.000Z");
  });

  it("starts the business month at local midnight on the first", () => {
    const monthStart = startOfBusinessMonth("Asia/Kolkata", earlyOnTheFirst);
    expect(monthStart.toISOString()).toBe("2026-08-31T18:30:00.000Z");
  });

  it("gives a half-open window that covers exactly one month", () => {
    const { startsAt, endsAt } = businessPeriodWindow("Asia/Kolkata", "2026-09");
    expect(startsAt.toISOString()).toBe("2026-08-31T18:30:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    // The instant from the audit falls inside September, which is the whole
    // point: an invoice raised then must not be filed under August.
    expect(earlyOnTheFirst >= startsAt && earlyOnTheFirst < endsAt).toBe(true);
  });

  it("rolls a December period into the next year", () => {
    const { endsAt } = businessPeriodWindow("Asia/Kolkata", "2026-12");
    expect(endsAt.toISOString()).toBe("2026-12-31T18:30:00.000Z");
  });

  it("handles a zone that observes daylight saving", () => {
    // 2026-03-29 is the European spring-forward. Midnight on the 30th is 22:00Z
    // on the 29th under BST, not 00:00Z — an offset-blind implementation gets
    // this an hour wrong.
    const afterTransition = new Date("2026-03-30T10:00:00Z");
    const dayStart = startOfBusinessDay("Europe/London", afterTransition);
    expect(dayStart.toISOString()).toBe("2026-03-29T23:00:00.000Z");
  });

  it("is identity for a UTC business", () => {
    expect(startOfBusinessDay("UTC", earlyOnTheFirst).toISOString()).toBe(
      "2026-08-31T00:00:00.000Z",
    );
  });
});
