import { describe, it, expect } from "vitest";
import { csvHeader, csvSampleRow, csvOptionSheet, parseCsvRow } from "./schema";

const fields = [
  { key: "brand", name: "Brand", kind: "REFERENCE" as const, options: [] },
  {
    key: "backType",
    name: "Back Type",
    kind: "OPTION" as const,
    options: [
      { id: "o1", label: "Single Back", shortCode: "SB" },
      { id: "o2", label: "Double Back", shortCode: "DB" },
    ],
  },
  { key: "headrests", name: "Headrests", kind: "VALUE" as const, options: [] },
];

describe("csvHeader", () => {
  it("starts with the fixed columns then one column per field", () => {
    expect(csvHeader(fields)).toEqual(["Alias", "Unit", "Brand", "Back Type", "Headrests"]);
  });

  it("returns just the fixed columns when a group has no fields", () => {
    expect(csvHeader([])).toEqual(["Alias", "Unit"]);
  });
});

describe("csvSampleRow", () => {
  it("fills each field with a usable example", () => {
    const row = csvSampleRow(fields);
    expect(row[0]).toBe("Short name");
    expect(row[1]).toBe("PCS");
    expect(row[3]).toBe("Single Back");
  });

  it("has the same length as the header", () => {
    expect(csvSampleRow(fields)).toHaveLength(csvHeader(fields).length);
  });

  it("leaves an option field blank when it has no options yet", () => {
    const bare = [{ key: "x", name: "X", kind: "OPTION" as const, options: [] }];
    expect(csvSampleRow(bare)[2]).toBe("");
  });
});

describe("csvOptionSheet", () => {
  it("lists valid values only for option fields", () => {
    expect(csvOptionSheet(fields)).toEqual([
      ["Back Type", "Single Back"],
      ["Back Type", "Double Back"],
    ]);
  });

  it("returns nothing when there are no option fields", () => {
    expect(csvOptionSheet([fields[0]])).toEqual([]);
  });
});

describe("parseCsvRow", () => {
  it("maps header columns back onto field keys", () => {
    const parsed = parseCsvRow(fields, {
      Alias: "Beige",
      Unit: "MTR",
      Brand: "Maruti",
      "Back Type": "Double Back",
      Headrests: "4",
    });
    expect(parsed).toEqual({
      aliasName: "Beige",
      unit: "MTR",
      values: { brand: "Maruti", backType: "Double Back", headrests: "4" },
    });
  });

  it("treats missing columns as empty rather than throwing", () => {
    const parsed = parseCsvRow(fields, { Alias: "X" });
    expect(parsed.values.brand).toBe("");
  });

  it("defaults the unit when the column is blank", () => {
    expect(parseCsvRow(fields, { Unit: "" }).unit).toBe("PCS");
  });

  it("trims surrounding whitespace from values", () => {
    expect(parseCsvRow(fields, { Brand: "  Maruti  " }).values.brand).toBe("Maruti");
  });
});

describe("parseCsvRow with a renamed alias column", () => {
  it("reads the group's own header when the file uses it", () => {
    const parsed = parseCsvRow(fields, { Kind: "Store", Unit: "PCS" }, "Kind");
    expect(parsed.aliasName).toBe("Store");
  });

  it("still reads a file exported before the rename", () => {
    const parsed = parseCsvRow(fields, { Alias: "Beige", Unit: "PCS" }, "Kind");
    expect(parsed.aliasName).toBe("Beige");
  });

  it("prefers the literal Alias when a file somehow carries both", () => {
    const parsed = parseCsvRow(fields, { Alias: "Beige", Kind: "Store", Unit: "PCS" }, "Kind");
    expect(parsed.aliasName).toBe("Beige");
  });

  it("defaults to Alias when no label is given", () => {
    expect(parseCsvRow(fields, { Alias: "Beige", Unit: "PCS" }).aliasName).toBe("Beige");
  });
});
