import { describe, expect, it } from "vitest";
import { GroundingCache, GroundingError, assertGrounded } from "./grounding";

describe("GroundingCache", () => {
  it("records ids from an array of rows and reports them seen", () => {
    const cache = new GroundingCache();
    cache.record([{ id: "party-1" }, { id: "party-2" }]);
    expect(cache.has("party-1")).toBe(true);
    expect(cache.has("party-2")).toBe(true);
    expect(cache.has("party-3")).toBe(false);
  });

  it("records ids from a single object result", () => {
    const cache = new GroundingCache();
    cache.record({ id: "work-1" });
    expect(cache.has("work-1")).toBe(true);
  });

  it("ignores rows without a string id", () => {
    const cache = new GroundingCache();
    cache.record([{ id: 42 }, { name: "no id field" }, null, "just a string"]);
    expect(cache.has("42")).toBe(false);
  });
});

describe("assertGrounded", () => {
  it("passes when every *Id field was seen in a query result", () => {
    const cache = new GroundingCache();
    cache.record([{ id: "party-1" }]);
    expect(() => assertGrounded({ partyId: "party-1", note: "ok" }, cache)).not.toThrow();
  });

  it("throws GroundingError when an *Id field was never queried", () => {
    const cache = new GroundingCache();
    expect(() => assertGrounded({ partyId: "invented-uuid" }, cache)).toThrow(GroundingError);
  });

  it("names every ungrounded field, not just the first", () => {
    const cache = new GroundingCache();
    try {
      assertGrounded({ partyId: "a", locationId: "b", note: "c" }, cache);
      throw new Error("expected assertGrounded to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(GroundingError);
      expect((err as GroundingError).fields).toEqual(["partyId", "locationId"]);
    }
  });

  it("ignores fields that do not end in Id", () => {
    const cache = new GroundingCache();
    expect(() => assertGrounded({ name: "no id here" }, cache)).not.toThrow();
  });

  it("ignores non-object input", () => {
    const cache = new GroundingCache();
    expect(() => assertGrounded(null, cache)).not.toThrow();
    expect(() => assertGrounded("string input", cache)).not.toThrow();
  });
});
