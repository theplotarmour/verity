import { describe, it, expect } from "vitest";
import { normaliseUnit, normaliseUnits } from "./item-units";

describe("normaliseUnit", () => {
  it("upper-cases and trims, so one unit is one unit", () => {
    expect(normaliseUnit(" mtr ")).toBe("MTR");
    expect(normaliseUnit("Mtr")).toBe("MTR");
  });

  it("treats blank as absent", () => {
    expect(normaliseUnit("")).toBeNull();
    expect(normaliseUnit("   ")).toBeNull();
    expect(normaliseUnit(null)).toBeNull();
    expect(normaliseUnit(undefined)).toBeNull();
  });
});

describe("normaliseUnits", () => {
  it("accepts a stocking unit on its own", () => {
    const result = normaliseUnits({ primaryUOM: "pcs" });
    expect(result).toEqual({ ok: true, units: { primaryUOM: "PCS", secondaryUOM: null, factor: null } });
  });

  it("accepts a purchase unit with a factor", () => {
    const result = normaliseUnits({ primaryUOM: "mtr", secondaryUOM: "roll", factor: 50 });
    expect(result).toEqual({
      ok: true,
      units: { primaryUOM: "MTR", secondaryUOM: "ROLL", factor: 50 },
    });
  });

  it("requires a stocking unit", () => {
    expect(normaliseUnits({ primaryUOM: "  " })).toEqual({
      ok: false,
      error: "A stocking unit is required",
    });
  });

  it("refuses a purchase unit that is the stocking unit under another spelling", () => {
    expect(normaliseUnits({ primaryUOM: "MTR", secondaryUOM: " mtr ", factor: 1 })).toEqual({
      ok: false,
      error: "The purchase unit must differ from the stocking unit",
    });
  });

  it("refuses a purchase unit with no factor, and asks in the owner's words", () => {
    // A half-defined conversion would make every goods receipt add the wrong
    // quantity to stock, so it is refused rather than stored.
    for (const factor of [null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(normaliseUnits({ primaryUOM: "mtr", secondaryUOM: "roll", factor })).toEqual({
        ok: false,
        error: "How many MTR are in one ROLL?",
      });
    }
  });

  it("drops a factor left behind when the purchase unit is cleared", () => {
    const result = normaliseUnits({ primaryUOM: "MTR", secondaryUOM: "", factor: 50 });
    expect(result).toEqual({ ok: true, units: { primaryUOM: "MTR", secondaryUOM: null, factor: null } });
  });

  it("takes a fractional factor — not every unit divides evenly", () => {
    const result = normaliseUnits({ primaryUOM: "KG", secondaryUOM: "BOX", factor: 2.5 });
    expect(result).toEqual({ ok: true, units: { primaryUOM: "KG", secondaryUOM: "BOX", factor: 2.5 } });
  });
});
