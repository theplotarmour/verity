import { describe, it, expect } from "vitest";

import { judgeSignal, type AnomalySignal } from "./anomalies";

/**
 * R6 — anomaly detection.
 *
 * The arithmetic that decides whether a week is off. Tested directly because it is
 * pure: the database supplies the counts, the model rephrases the sentence, but the
 * decision "this is a spike" is here and must not depend on either.
 */

const signal = (over: Partial<AnomalySignal>): AnomalySignal => ({
  kind: "booking_cancellations",
  label: "Booking cancellations",
  recent: 0,
  baselineDaily: 0,
  ...over,
});

describe("judgeSignal", () => {
  it("ignores a low count even when it is above baseline", () => {
    // Two cancellations against a baseline of half a day is 4x, but two is not a
    // pattern — the absolute floor stops noise from a normally-zero metric.
    expect(judgeSignal(signal({ recent: 2, baselineDaily: 0.5 }))).toBeNull();
  });

  it("flags a real spike against a real baseline", () => {
    const a = judgeSignal(signal({ recent: 8, baselineDaily: 2 }));
    expect(a).not.toBeNull();
    expect(a!.kind).toBe("booking_cancellations");
    expect(a!.detail).toContain("8");
    expect(a!.detail).toContain("4.0×");
  });

  it("does not flag a count that is normal for this tenant", () => {
    // Six a day against a five-a-day baseline is 1.2x — busy, not anomalous.
    expect(judgeSignal(signal({ recent: 6, baselineDaily: 5 }))).toBeNull();
  });

  it("escalates a large multiple to warn, a small one to info", () => {
    expect(judgeSignal(signal({ recent: 6, baselineDaily: 2 }))!.severity).toBe("info"); // 3x
    expect(judgeSignal(signal({ recent: 20, baselineDaily: 2 }))!.severity).toBe("warn"); // 10x
  });

  it("flags an outright high count when there is no history", () => {
    // A brand-new metric with no baseline: only an outright high count pings.
    expect(judgeSignal(signal({ recent: 3, baselineDaily: 0 }))).toBeNull();
    const a = judgeSignal(signal({ recent: 6, baselineDaily: 0 }));
    expect(a).not.toBeNull();
    expect(a!.severity).toBe("warn");
    expect(a!.detail).toContain("little history");
  });

  it("reads naturally when the baseline is below one a day", () => {
    const a = judgeSignal(signal({ recent: 4, baselineDaily: 0.5 }));
    expect(a!.detail).toContain("well under one a day");
  });
});
