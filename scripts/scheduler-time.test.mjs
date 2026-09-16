import { describe, expect, it } from "vitest";
import { nextBoundary } from "./scheduler-time.mjs";

describe("on-prem scheduler UTC boundaries", () => {
  const now = new Date("2026-09-16T07:36:42.123Z"); // Wednesday

  it.each([
    ["frequent", "2026-09-16T07:37:00.000Z"],
    ["hourly", "2026-09-16T08:00:00.000Z"],
    ["daily", "2026-09-17T00:00:00.000Z"],
    ["weekly", "2026-09-21T00:00:00.000Z"],
  ])("maps %s to its next boundary", (cadence, expected) => {
    expect(nextBoundary(cadence, now).toISOString()).toBe(expected);
  });

  it("never accepts an undeclared cadence", () => {
    expect(() => nextBoundary("monthly", now)).toThrow(/unknown cadence/);
  });
});
