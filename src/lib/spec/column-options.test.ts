import { describe, it, expect } from "vitest";
import { columnKeys, isStillOffered, rowsMatching, type TargetRow } from "./column-options";

// Vehicle > Car, exactly as the owner keeps it: one flat subcategory whose rows
// are whole vehicles, with three pick-from-list columns across them.
const BRAND = "f_brand";
const MODEL = "f_model";
const GEN = "f_gen";

const cars: TargetRow[] = [
  { itemId: "1", values: { [BRAND]: "tata", [MODEL]: "nexon", [GEN]: "2017" } },
  { itemId: "2", values: { [BRAND]: "tata", [MODEL]: "nexon", [GEN]: "2021" } },
  { itemId: "3", values: { [BRAND]: "tata", [MODEL]: "punch", [GEN]: "2021" } },
  { itemId: "4", values: { [BRAND]: "maruti", [MODEL]: "swift", [GEN]: "2012" } },
  { itemId: "5", values: { [BRAND]: "maruti", [MODEL]: "swift", [GEN]: "2020" } },
];

describe("columnKeys", () => {
  it("offers every value of a column when nothing is chosen yet", () => {
    expect(columnKeys(cars, BRAND)).toEqual(["tata", "maruti"]);
    expect(columnKeys(cars, MODEL)).toEqual(["nexon", "punch", "swift"]);
  });

  it("shows only that brand's models once a brand is chosen", () => {
    // The whole point. Reading the Model column on its own gives the union —
    // Swift under Tata — which is the mixing this prevents.
    expect(columnKeys(cars, MODEL, { [BRAND]: "tata" })).toEqual(["nexon", "punch"]);
    expect(columnKeys(cars, MODEL, { [BRAND]: "maruti" })).toEqual(["swift"]);
  });

  it("narrows by every column chosen so far, not just the last", () => {
    expect(columnKeys(cars, GEN, { [BRAND]: "tata", [MODEL]: "nexon" })).toEqual(["2017", "2021"]);
    expect(columnKeys(cars, GEN, { [BRAND]: "tata", [MODEL]: "punch" })).toEqual(["2021"]);
  });

  it("does not narrow a column by its own current answer", () => {
    // Otherwise re-opening the Model dropdown would offer only the model
    // already picked, and there would be no way to change it.
    expect(columnKeys(cars, MODEL, { [BRAND]: "tata", [MODEL]: "nexon" })).toEqual([
      "nexon",
      "punch",
    ]);
  });

  it("ignores a filter that has not been answered", () => {
    expect(columnKeys(cars, MODEL, { [BRAND]: null })).toEqual(["nexon", "punch", "swift"]);
    expect(columnKeys(cars, MODEL, { [BRAND]: "" })).toEqual(["nexon", "punch", "swift"]);
  });

  it("returns nothing when the combination was never recorded", () => {
    // The rows are the authority: a vehicle nobody entered cannot be picked.
    expect(columnKeys(cars, GEN, { [BRAND]: "maruti", [MODEL]: "nexon" })).toEqual([]);
  });

  it("skips rows that left the column blank", () => {
    const sparse: TargetRow[] = [
      ...cars,
      { itemId: "6", values: { [BRAND]: "tata", [MODEL]: null, [GEN]: "2024" } },
    ];
    expect(columnKeys(sparse, MODEL, { [BRAND]: "tata" })).toEqual(["nexon", "punch"]);
  });

  it("keeps first-appearance order, so the list does not reshuffle", () => {
    expect(columnKeys(cars, GEN)).toEqual(["2017", "2021", "2012", "2020"]);
  });
});

describe("rowsMatching", () => {
  it("returns everything when no filter is active", () => {
    expect(rowsMatching(cars, {})).toHaveLength(5);
    expect(rowsMatching(cars, { [BRAND]: null })).toHaveLength(5);
  });

  it("matches on every active filter at once", () => {
    expect(rowsMatching(cars, { [BRAND]: "tata", [GEN]: "2021" }).map((r) => r.itemId)).toEqual([
      "2",
      "3",
    ]);
  });
});

describe("isStillOffered", () => {
  it("holds an answer that survives the narrowing", () => {
    expect(isStillOffered(cars, MODEL, "nexon", { [BRAND]: "tata" })).toBe(true);
  });

  it("rejects one stranded by a change above it", () => {
    // Switching Tata to Maruti leaves Nexon selected with nothing on screen
    // saying it is now wrong.
    expect(isStillOffered(cars, MODEL, "nexon", { [BRAND]: "maruti" })).toBe(false);
  });

  it("treats an unanswered column as fine", () => {
    expect(isStillOffered(cars, MODEL, null, { [BRAND]: "maruti" })).toBe(true);
  });
});
