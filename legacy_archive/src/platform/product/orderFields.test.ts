import { describe, expect, it } from "vitest";

import {
  AUTOMOTIVE_KEYS,
  PREFER_DYNAMIC,
  readOrderFields,
  writeOrderFields,
} from "./orderFields";

/**
 * The accessor is the seam the whole Phase 1 migration runs through, so the
 * properties that make it safe are worth pinning down: reads must not change
 * behaviour today, and writes must populate both representations so the
 * PREFER_DYNAMIC flip is reversible.
 */

describe("order field accessor", () => {
  it("still prefers legacy columns, so migrating a call site changes nothing", () => {
    expect(PREFER_DYNAMIC).toBe(false);

    const fields = readOrderFields({
      vehicleBrandId: "brand_honda",
      seatType: "DB",
      headrestCount: 5,
      hasArmrest: true,
      dynamicData: { [AUTOMOTIVE_KEYS.seatType]: "SB", [AUTOMOTIVE_KEYS.headrests]: 2 },
    });

    expect(fields[AUTOMOTIVE_KEYS.brandId]).toBe("brand_honda");
    expect(fields[AUTOMOTIVE_KEYS.seatType]).toBe("DB");
    expect(fields[AUTOMOTIVE_KEYS.headrests]).toBe(5);
    expect(fields[AUTOMOTIVE_KEYS.armrest]).toBe(true);
  });

  it("falls back to dynamicData per-field when a column is null", () => {
    // An order created natively (no legacy columns) must still read correctly.
    const fields = readOrderFields({
      vehicleBrandId: null,
      seatType: null,
      dynamicData: { [AUTOMOTIVE_KEYS.brandId]: "brand_maruti", [AUTOMOTIVE_KEYS.seatType]: "SB" },
    });

    expect(fields[AUTOMOTIVE_KEYS.brandId]).toBe("brand_maruti");
    expect(fields[AUTOMOTIVE_KEYS.seatType]).toBe("SB");
  });

  it("passes through fields no column exists for", () => {
    // The whole point: a furniture order has fields core knows nothing about.
    const fields = readOrderFields({
      dynamicData: { wood_type: "Oak", dimensions: "180x90", seats: 6 },
    });

    expect(fields.wood_type).toBe("Oak");
    expect(fields.dimensions).toBe("180x90");
    expect(fields.seats).toBe(6);
  });

  it("returns nulls rather than undefined for an empty order", () => {
    const fields = readOrderFields({});
    expect(fields[AUTOMOTIVE_KEYS.brandId]).toBeNull();
    expect(fields[AUTOMOTIVE_KEYS.headrests]).toBeNull();
  });

  it("dual-writes both representations so the flip is reversible", () => {
    const payload = writeOrderFields({
      [AUTOMOTIVE_KEYS.brandId]: "brand_honda",
      [AUTOMOTIVE_KEYS.seatType]: "DB",
      [AUTOMOTIVE_KEYS.headrests]: 5,
      [AUTOMOTIVE_KEYS.armrest]: true,
    });

    expect(payload.vehicleBrandId).toBe("brand_honda");
    expect(payload.seatType).toBe("DB");
    expect(payload.headrestCount).toBe(5);
    expect(payload.hasArmrest).toBe(true);
    expect(payload.dynamicData[AUTOMOTIVE_KEYS.brandId]).toBe("brand_honda");
    expect(payload.dynamicData[AUTOMOTIVE_KEYS.headrests]).toBe(5);
  });

  it("merges into existing dynamicData instead of clobbering it", () => {
    const payload = writeOrderFields(
      { [AUTOMOTIVE_KEYS.seatType]: "SB" },
      { customer_note: "handle with care", wood_type: "Oak" },
    );

    expect(payload.dynamicData.customer_note).toBe("handle with care");
    expect(payload.dynamicData.wood_type).toBe("Oak");
    expect(payload.dynamicData[AUTOMOTIVE_KEYS.seatType]).toBe("SB");
  });

  it("coerces headrest counts safely", () => {
    expect(writeOrderFields({ [AUTOMOTIVE_KEYS.headrests]: "5" }).headrestCount).toBe(5);
    expect(writeOrderFields({ [AUTOMOTIVE_KEYS.headrests]: "" }).headrestCount).toBeNull();
    expect(writeOrderFields({ [AUTOMOTIVE_KEYS.headrests]: null }).headrestCount).toBeNull();
    // A non-numeric value must not become NaN in the database.
    expect(writeOrderFields({ [AUTOMOTIVE_KEYS.headrests]: "abc" }).headrestCount).toBeNull();
  });

  it("round-trips: write then read yields what was written", () => {
    const original = {
      [AUTOMOTIVE_KEYS.brandId]: "brand_honda",
      [AUTOMOTIVE_KEYS.modelId]: "model_city",
      [AUTOMOTIVE_KEYS.year]: "2017",
      [AUTOMOTIVE_KEYS.seatType]: "DB",
      [AUTOMOTIVE_KEYS.armrest]: true,
      [AUTOMOTIVE_KEYS.headrests]: 5,
    };

    const written = writeOrderFields(original);
    const read = readOrderFields(written);

    for (const [key, value] of Object.entries(original)) {
      expect({ key, value: read[key] }).toEqual({ key, value });
    }
  });
});
