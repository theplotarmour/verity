import { describe, it, expect } from "vitest";
import {
  BUILTIN_COLUMNS,
  classifyFields,
  columnTypeId,
  columnTypeLabel,
  COLUMN_TYPES,
  resolveColumnLabels,
} from "./columns";

describe("resolveColumnLabels", () => {
  it("falls back to the default word when no label is set", () => {
    expect(resolveColumnLabels({ codeLabel: null, nameLabel: null, aliasLabel: null })).toEqual({
      code: "Code",
      name: "Label",
      alias: "Alias",
    });
  });

  it("uses a configured label", () => {
    expect(
      resolveColumnLabels({ codeLabel: null, nameLabel: null, aliasLabel: "Kind" }).alias
    ).toBe("Kind");
  });

  it("treats a blank or whitespace label as unset", () => {
    expect(resolveColumnLabels({ codeLabel: "   ", nameLabel: "", aliasLabel: null })).toEqual({
      code: "Code",
      name: "Label",
      alias: "Alias",
    });
  });

  it("exposes the three built-ins in grid order", () => {
    expect(BUILTIN_COLUMNS.map((c) => c.id)).toEqual(["code", "name", "alias"]);
  });

  it("allows only the alias column to be hidden", () => {
    expect(BUILTIN_COLUMNS.filter((c) => c.canHide).map((c) => c.id)).toEqual(["alias"]);
  });
});

describe("classifyFields", () => {
  const names = new Map([
    ["rm", "Raw Material"],
    ["lea", "Leatherite"],
  ]);
  const fields = [
    { id: "f1", groupId: "rm" },
    { id: "f2", groupId: "lea" },
  ];

  it("marks a field defined elsewhere as inherited, naming its owner", () => {
    const [first] = classifyFields(fields, "lea", names);
    expect(first.inherited).toBe(true);
    expect(first.ownerName).toBe("Raw Material");
  });

  it("marks a field defined here as own, with no owner name", () => {
    const [, second] = classifyFields(fields, "lea", names);
    expect(second.inherited).toBe(false);
    expect(second.ownerName).toBeNull();
  });

  it("marks everything as own when standing on the defining group", () => {
    expect(classifyFields(fields, "rm", names)[0].inherited).toBe(false);
  });

  it("falls back to a neutral owner name when the group is unknown", () => {
    expect(classifyFields([{ id: "f1", groupId: "ghost" }], "lea", names)[0].ownerName).toBe(
      "another category"
    );
  });

  it("preserves the incoming order", () => {
    expect(classifyFields(fields, "lea", names).map((c) => c.field.id)).toEqual(["f1", "f2"]);
  });
});

describe("column types", () => {
  it("offers one flat list, no kind/valueType split", () => {
    expect(COLUMN_TYPES.map((t) => t.id)).toEqual([
      "TEXT",
      "TEXTAREA",
      "NUMBER",
      "MEASUREMENT",
      "TOGGLE",
      "DATE",
      "COLOR",
      "IMAGE",
      "FILE",
      "OPTION",
      "REFERENCE",
    ]);
  });

  it("never shows a raw enum to the owner", () => {
    for (const t of COLUMN_TYPES) expect(t.label).not.toMatch(/^[A-Z_]+$/);
  });

  it("derives kind from the choice", () => {
    expect(COLUMN_TYPES.find((t) => t.id === "OPTION")!.kind).toBe("OPTION");
    expect(COLUMN_TYPES.find((t) => t.id === "NUMBER")!.kind).toBe("VALUE");
    expect(COLUMN_TYPES.find((t) => t.id === "REFERENCE")!.valueType).toBeNull();
  });

  it("round-trips a stored field back to its choice id", () => {
    expect(columnTypeId("VALUE", "MEASUREMENT")).toBe("MEASUREMENT");
    expect(columnTypeId("OPTION", null)).toBe("OPTION");
    expect(columnTypeId("REFERENCE", null)).toBe("REFERENCE");
    expect(columnTypeLabel("VALUE", "MEASUREMENT")).toBe("Number with unit");
  });

  it("labels an unrecognised stored combination as plain text", () => {
    expect(columnTypeLabel("VALUE", "NONSENSE")).toBe("Text");
    expect(columnTypeLabel("VALUE", null)).toBe("Text");
  });
});
