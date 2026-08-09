import { describe, it, expect } from "vitest";
import { specHash } from "./hash";

describe("specHash", () => {
  const answers = { brand: "b1", model: "m1", headrests: "4" };

  it("returns a 64-character hex digest", () => {
    expect(specHash("g1", answers)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable across key order", () => {
    const reordered = { headrests: "4", model: "m1", brand: "b1" };
    expect(specHash("g1", reordered)).toBe(specHash("g1", answers));
  });

  it("differs when a value differs", () => {
    expect(specHash("g1", { ...answers, headrests: "5" })).not.toBe(specHash("g1", answers));
  });

  it("differs when the group differs", () => {
    expect(specHash("g2", answers)).not.toBe(specHash("g1", answers));
  });

  it("ignores empty answers so an added optional field does not change identity", () => {
    expect(specHash("g1", { ...answers, note: "" })).toBe(specHash("g1", answers));
  });

  it("does not collide when values are shuffled between keys", () => {
    expect(specHash("g1", { brand: "m1", model: "b1", headrests: "4" })).not.toBe(
      specHash("g1", answers)
    );
  });

  it("does not collide on concatenation ambiguity", () => {
    // ("ab","c") must not hash the same as ("a","bc").
    expect(specHash("g1", { k: "ab", j: "c" })).not.toBe(specHash("g1", { k: "a", j: "bc" }));
  });

  it("hashes an empty answer set deterministically", () => {
    expect(specHash("g1", {})).toBe(specHash("g1", {}));
  });
});
