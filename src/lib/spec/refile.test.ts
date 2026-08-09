import { describe, it, expect } from "vitest";
import { needsRefiling, refileRefKey } from "./refile";

const target = {
  optionIds: new Set(["opt_tata", "opt_swift"]),
  itemIds: new Set(["item_nexon"]),
};

describe("refileRefKey", () => {
  it("files a known option as an option", () => {
    expect(refileRefKey("opt_swift", target)).toEqual({ optionId: "opt_swift" });
  });

  it("files a known item as a link to that item", () => {
    expect(refileRefKey("item_nexon", target)).toEqual({ valueItemId: "item_nexon" });
  });

  it("leaves an unrecognised key as text", () => {
    // A column the owner types into freely has no ids to match, so text is the
    // only remaining possibility — not a guess.
    expect(refileRefKey("220", target)).toEqual({ valueText: "220" });
  });

  it("never stores an id in the wrong slot", () => {
    // The bug this exists to stop: an option id written as valueText, which
    // then printed into the item's own name as "cmsarwnx5... DB 5".
    const result = refileRefKey("opt_tata", target);
    expect(result).not.toHaveProperty("valueText");
  });
});

describe("needsRefiling", () => {
  it("is true only when the client could not tell", () => {
    expect(needsRefiling({ refKey: "opt_tata" })).toBe(true);
  });

  it("leaves an answer that already named its slot alone", () => {
    expect(needsRefiling({ refKey: "opt_tata", optionId: "opt_tata" })).toBe(false);
    expect(needsRefiling({ refKey: "item_nexon", valueItemId: "item_nexon" })).toBe(false);
  });

  it("ignores an answer with no key at all", () => {
    expect(needsRefiling({})).toBe(false);
    expect(needsRefiling({ refKey: null })).toBe(false);
  });
});
