import { describe, it, expect } from "vitest";
import { toFieldKey } from "./key";

describe("toFieldKey", () => {
  it("lowercases a single word", () => {
    expect(toFieldKey("Brand")).toBe("brand");
  });

  it("camel-cases multiple words", () => {
    expect(toFieldKey("Back Type")).toBe("backType");
  });

  it("drops punctuation", () => {
    expect(toFieldKey("Fabric (GSM)")).toBe("fabricGsm");
  });

  it("collapses repeated separators", () => {
    expect(toFieldKey("Foam  --  Density")).toBe("foamDensity");
  });

  it("trims surrounding whitespace", () => {
    expect(toFieldKey("  Colour  ")).toBe("colour");
  });

  it("falls back to 'field' when nothing usable remains", () => {
    expect(toFieldKey("!!!")).toBe("field");
  });

  it("keeps digits", () => {
    expect(toFieldKey("Layer 2 Thickness")).toBe("layer2Thickness");
  });
});
