import { describe, it, expect } from "vitest";
import {
  groupChain,
  mergeInheritedFields,
  descendantIds,
  resolveAnswer,
  resolveAnswers,
  findLinkColumn,
} from "./resolve";

const groups = [
  { id: "rm", parentId: null },
  { id: "fab", parentId: "rm" },
  { id: "lea", parentId: "fab" },
];

describe("groupChain", () => {
  it("returns root-first ancestry including the group itself", () => {
    expect(groupChain(groups, "lea").map((g) => g.id)).toEqual(["rm", "fab", "lea"]);
  });

  it("returns just the group for a root", () => {
    expect(groupChain(groups, "rm").map((g) => g.id)).toEqual(["rm"]);
  });

  it("returns an empty chain for an unknown group", () => {
    expect(groupChain(groups, "nope")).toEqual([]);
  });

  it("terminates on a cycle instead of looping forever", () => {
    const cyclic = [
      { id: "a", parentId: "b" },
      { id: "b", parentId: "a" },
    ];
    expect(groupChain(cyclic, "a").length).toBeLessThanOrEqual(3);
  });
});

describe("mergeInheritedFields", () => {
  const fields = [
    { id: "f1", groupId: "fab", key: "gsm", sortOrder: 0, archivedAt: null },
    { id: "f2", groupId: "lea", key: "grain", sortOrder: 0, archivedAt: null },
    { id: "f3", groupId: "fab", key: "grain", sortOrder: 1, archivedAt: null },
    { id: "f4", groupId: "rm", key: "old", sortOrder: 0, archivedAt: new Date() },
  ];

  it("collects ancestor fields before own fields", () => {
    const merged = mergeInheritedFields(["rm", "fab", "lea"], fields);
    expect(merged.map((f) => f.key)).toEqual(["gsm", "grain"]);
  });

  it("lets a descendant override an ancestor field with the same key", () => {
    const merged = mergeInheritedFields(["rm", "fab", "lea"], fields);
    expect(merged.find((f) => f.key === "grain")!.id).toBe("f2");
  });

  it("excludes archived fields", () => {
    const merged = mergeInheritedFields(["rm", "fab", "lea"], fields);
    expect(merged.some((f) => f.key === "old")).toBe(false);
  });

  it("ignores fields belonging to groups outside the chain", () => {
    const merged = mergeInheritedFields(["rm", "fab"], fields);
    expect(merged.map((f) => f.id)).toEqual(["f1", "f3"]);
  });

  it("returns nothing for an empty chain", () => {
    expect(mergeInheritedFields([], fields)).toEqual([]);
  });
});

describe("descendantIds", () => {
  const tree = [
    { id: "rm", parentId: null },
    { id: "fab", parentId: "rm" },
    { id: "lea", parentId: "fab" },
    { id: "suede", parentId: "fab" },
    { id: "foam", parentId: "rm" },
  ];

  it("includes the root itself", () => {
    expect(descendantIds(tree, "lea")).toEqual(["lea"]);
  });

  it("collects every descendant", () => {
    expect(descendantIds(tree, "fab").sort()).toEqual(["fab", "lea", "suede"]);
  });

  it("collects the whole subtree from a root", () => {
    expect(descendantIds(tree, "rm").sort()).toEqual(["fab", "foam", "lea", "rm", "suede"]);
  });

  it("returns the id alone when the group is unknown", () => {
    expect(descendantIds(tree, "nope")).toEqual(["nope"]);
  });
});

describe("resolveAnswer", () => {
  it("resolves a text value", () => {
    const field = { kind: "VALUE" as const, valueType: "TEXT", unitSuffix: null };
    expect(resolveAnswer(field, { valueText: "Napa" })).toEqual({ name: "Napa", code: "Napa" });
  });

  it("appends the unit suffix to a number for the name but not the code", () => {
    const field = { kind: "VALUE" as const, valueType: "NUMBER", unitSuffix: "HDR" };
    expect(resolveAnswer(field, { valueNumber: 4 })).toEqual({ name: "4HDR", code: "4" });
  });

  it("resolves an option to its label and short code", () => {
    const field = { kind: "OPTION" as const, valueType: null, unitSuffix: null };
    const raw = { option: { label: "Double Back", shortCode: "DB" } };
    expect(resolveAnswer(field, raw)).toEqual({ name: "Double Back", code: "DB" });
  });

  it("falls back to the label when an option has no short code", () => {
    const field = { kind: "OPTION" as const, valueType: null, unitSuffix: null };
    const raw = { option: { label: "Double Back", shortCode: null } };
    expect(resolveAnswer(field, raw)).toEqual({ name: "Double Back", code: "Double Back" });
  });

  it("prefers the alias over the name for an item reference", () => {
    const field = { kind: "REFERENCE" as const, valueType: null, unitSuffix: null };
    const raw = {
      valueItem: { name: "Leatherite Beige 220 GSM", aliasName: "Beige", itemCode: "RM-0042" },
    };
    expect(resolveAnswer(field, raw)).toEqual({ name: "Beige", code: "RM-0042" });
  });

  it("uses the name when a referenced item has no alias", () => {
    const field = { kind: "REFERENCE" as const, valueType: null, unitSuffix: null };
    const raw = { valueItem: { name: "Napa Black", aliasName: null, itemCode: "RM-0007" } };
    expect(resolveAnswer(field, raw)).toEqual({ name: "Napa Black", code: "RM-0007" });
  });

  it("resolves an attribute-master reference by its label", () => {
    const field = { kind: "REFERENCE" as const, valueType: null, unitSuffix: null };
    expect(resolveAnswer(field, { refLabel: "Maruti", refCode: "MRT" })).toEqual({
      name: "Maruti",
      code: "MRT",
    });
  });

  it("renders a boolean as Yes or No", () => {
    const field = { kind: "VALUE" as const, valueType: "TOGGLE", unitSuffix: null };
    expect(resolveAnswer(field, { valueBool: false })).toEqual({ name: "No", code: "No" });
  });

  it("treats zero as answered rather than empty", () => {
    const field = { kind: "VALUE" as const, valueType: "NUMBER", unitSuffix: "mm" };
    expect(resolveAnswer(field, { valueNumber: 0 })).toEqual({ name: "0mm", code: "0" });
  });

  it("returns null when nothing is answered", () => {
    const field = { kind: "VALUE" as const, valueType: "TEXT", unitSuffix: null };
    expect(resolveAnswer(field, {})).toBeNull();
  });
});

describe("resolveAnswers", () => {
  it("keys resolved values by the field token and omits unanswered fields", () => {
    const fields = [
      { key: "brand", kind: "REFERENCE" as const, valueType: null, unitSuffix: null },
      { key: "gsm", kind: "VALUE" as const, valueType: "NUMBER", unitSuffix: "GSM" },
    ];
    const out = resolveAnswers(fields, { gsm: { valueNumber: 220 } });
    expect(out).toEqual({ gsm: { name: "220GSM", code: "220" } });
  });
});

describe("findLinkColumn", () => {
  const brandLink = { id: "f1", kind: "REFERENCE", targetGroupId: "brand" };
  const other = { id: "f2", kind: "REFERENCE", targetGroupId: "design" };
  const value = { id: "f3", kind: "VALUE", targetGroupId: null };

  it("finds the one column pointing at the parent category", () => {
    expect(findLinkColumn([value, brandLink, other], "brand")).toBe(brandLink);
  });

  it("ignores columns that are not references", () => {
    const looksRight = { id: "f4", kind: "VALUE", targetGroupId: "brand" };
    expect(findLinkColumn([looksRight], "brand")).toBeNull();
  });

  it("returns null when nothing links back", () => {
    expect(findLinkColumn([value, other], "brand")).toBeNull();
  });

  it("refuses rather than guessing when two columns link to the same category", () => {
    // Filtering by whichever happened to sort first would narrow the list by
    // something the owner never chose.
    const second = { id: "f5", kind: "REFERENCE", targetGroupId: "brand" };
    expect(findLinkColumn([brandLink, second], "brand")).toBeNull();
  });

  it("returns null for an empty field list", () => {
    expect(findLinkColumn([], "brand")).toBeNull();
  });
});
