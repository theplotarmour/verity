import { describe, it, expect } from "vitest";
import { buildLinkTargets, linkTargetIdOf, SYSTEM_LINK_TARGETS } from "./link-targets";

// Categories the owner built. Nothing here is marked as special, because after
// domainType was deleted there is no marker left to carry — Design and Colour
// are ordinary roots exactly like Raw Material.
const groups = [
  { id: "rm", name: "Raw Material", parentId: null },
  { id: "fab", name: "Fabric", parentId: "rm" },
  { id: "lea", name: "Leatherite", parentId: "fab" },
  { id: "des", name: "Design", parentId: null },
  { id: "ultra", name: "ULTRA", parentId: "des" },
  { id: "col", name: "Colour", parentId: null },
  { id: "warm", name: "Warm", parentId: "col" },
];

describe("buildLinkTargets", () => {
  it("offers every item category, including nested ones", () => {
    const ids = buildLinkTargets(groups).map((t) => t.id);
    expect(ids).toContain("group:rm");
    expect(ids).toContain("group:fab");
    expect(ids).toContain("group:lea");
  });

  it("leads with the name and puts the path beneath it", () => {
    // A dropdown truncates, so the distinguishing part has to come first:
    // five families all reading "Design › A category › UL…" are unusable.
    const lea = buildLinkTargets(groups).find((t) => t.id === "group:lea")!;
    expect(lea.label).toBe("Leatherite");
    expect(lea.sublabel).toBe("Raw Material › Fabric");
  });

  it("gives a root no ancestry to show", () => {
    const rm = buildLinkTargets(groups).find((t) => t.id === "group:rm")!;
    expect(rm.label).toBe("Raw Material");
    expect(rm.sublabel).toBe("Category");
  });

  it("maps an item category to an ITEM_GROUP reference", () => {
    const fab = buildLinkTargets(groups).find((t) => t.id === "group:fab")!;
    expect(fab.refTarget).toBe("ITEM_GROUP");
    expect(fab.targetGroupId).toBe("fab");
  });

  it("maps a built-in list to its own refTarget, with no group", () => {
    const sup = buildLinkTargets(groups).find((t) => t.id === "system:SUPPLIER")!;
    expect(sup.refTarget).toBe("SUPPLIER");
    expect(sup.targetGroupId).toBeNull();
  });

  it("gives every category columns to show", () => {
    const targets = buildLinkTargets(groups);
    expect(targets.find((t) => t.id === "group:fab")!.hasColumns).toBe(true);
    expect(targets.find((t) => t.id === "group:des")!.hasColumns).toBe(true);
  });

  it("offers no column choice on a built-in list", () => {
    // Supplier, Warehouse and friends are counterparties and infrastructure on
    // their own screens. A column points at the row, not at one of its fields.
    const targets = buildLinkTargets(groups);
    expect(targets.find((t) => t.id === "system:SUPPLIER")!.hasColumns).toBe(false);
    expect(targets.find((t) => t.id === "system:WAREHOUSE_BIN")!.hasColumns).toBe(false);
  });

  it("treats Design and Colour as ordinary categories", () => {
    // Both used to be tables of their own. They are now roots the owner built,
    // so they arrive through the same branch as Raw Material.
    const targets = buildLinkTargets(groups);
    for (const id of ["group:col", "group:des"]) {
      const t = targets.find((x) => x.id === id)!;
      expect(t.refTarget).toBe("ITEM_GROUP");
      expect(t.hasColumns).toBe(true);
    }
    // And their subcategories come with them, like any other category's.
    expect(targets.map((t) => t.id)).toEqual(expect.arrayContaining(["group:warm", "group:ultra"]));
  });

  it("offers each target exactly once", () => {
    const ids = buildLinkTargets(groups).map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("scopes a subcategory to itself, whatever its root once was", () => {
    const ultra = buildLinkTargets(groups).find((t) => t.id === "group:ultra")!;
    expect(ultra.label).toBe("ULTRA");
    expect(ultra.sublabel).toBe("Design");
    expect(ultra.refTarget).toBe("ITEM_GROUP");
    expect(ultra.targetGroupId).toBe("ultra");
  });

  it("keeps the system lists that have no category behind them", () => {
    const ids = buildLinkTargets(groups).map((t) => t.id);
    for (const s of SYSTEM_LINK_TARGETS) expect(ids).toContain(`system:${s.refTarget}`);
  });

  it("makes the path searchable, not just the leaf name", () => {
    const lea = buildLinkTargets(groups).find((t) => t.id === "group:lea")!;
    expect(lea.searchText).toContain("raw material");
    expect(lea.searchText).toContain("leatherite");
  });

  it("terminates on a cycle rather than hanging", () => {
    const cyclic = [
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ];
    expect(() => buildLinkTargets(cyclic)).not.toThrow();
  });
});

describe("linkTargetIdOf", () => {
  it("round-trips an item-group field back to its option", () => {
    expect(linkTargetIdOf({ refTarget: "ITEM_GROUP", targetGroupId: "fab" })).toBe("group:fab");
  });

  it("round-trips a built-in list", () => {
    expect(linkTargetIdOf({ refTarget: "SUPPLIER", targetGroupId: null })).toBe("system:SUPPLIER");
    expect(linkTargetIdOf({ refTarget: "WAREHOUSE_BIN", targetGroupId: null })).toBe(
      "system:WAREHOUSE_BIN"
    );
  });

  it("reads a column saved against a deleted table back as its category", () => {
    // Columns written before Design and Colour became categories still carry
    // the old refTarget. They must resolve to the group they were scoped to
    // rather than vanishing from the picker.
    expect(linkTargetIdOf({ refTarget: "DESIGN", targetGroupId: "ultra" })).toBe("group:ultra");
    expect(linkTargetIdOf({ refTarget: "COLOR", targetGroupId: "warm" })).toBe("group:warm");
  });

  it("round-trips every target buildLinkTargets produces", () => {
    for (const t of buildLinkTargets(groups)) {
      expect(linkTargetIdOf({ refTarget: t.refTarget, targetGroupId: t.targetGroupId })).toBe(t.id);
    }
  });

  it("returns null for a field that has not been pointed anywhere yet", () => {
    expect(linkTargetIdOf({ refTarget: null, targetGroupId: null })).toBeNull();
    expect(linkTargetIdOf({ refTarget: "ITEM_GROUP", targetGroupId: null })).toBeNull();
  });
});
