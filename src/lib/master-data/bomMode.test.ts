import { describe, expect, it } from "vitest";

import {
  bomModeOf,
  resolveAllBomModes,
  resolveBomMode,
  type BomModeNode,
} from "./bomMode";

/** Finished Good → Seat Cover → Front Seat Cover, mode stated only at the root. */
const tree: BomModeNode[] = [
  { id: "fg", parentId: null, bomMode: "RECIPE" },
  { id: "seat", parentId: "fg", bomMode: null },
  { id: "front", parentId: "seat", bomMode: null },
  { id: "rm", parentId: null, bomMode: null },
  { id: "fabric", parentId: "rm", bomMode: "INGREDIENTS" },
  { id: "cotton", parentId: "fabric", bomMode: null },
];

describe("resolveBomMode", () => {
  it("uses the category's own mode when it states one", () => {
    expect(resolveBomMode("fg", tree)).toEqual({
      mode: "RECIPE",
      stated: true,
      inheritedFromId: null,
    });
  });

  it("inherits from the parent", () => {
    expect(resolveBomMode("seat", tree)).toEqual({
      mode: "RECIPE",
      stated: false,
      inheritedFromId: "fg",
    });
  });

  it("inherits from the nearest stating ancestor, not the root", () => {
    expect(resolveBomMode("cotton", tree)).toEqual({
      mode: "INGREDIENTS",
      stated: false,
      inheritedFromId: "fabric",
    });
  });

  it("walks past ancestors that state nothing", () => {
    expect(resolveBomMode("front", tree)).toEqual({
      mode: "RECIPE",
      stated: false,
      inheritedFromId: "fg",
    });
  });

  it("falls back to OFF when nothing on the path states a mode", () => {
    expect(resolveBomMode("rm", tree)).toEqual({
      mode: "OFF",
      stated: false,
      inheritedFromId: null,
    });
  });

  it("treats an explicit OFF as stated, not as absent", () => {
    const stated: BomModeNode[] = [
      { id: "fg", parentId: null, bomMode: "RECIPE" },
      { id: "trim", parentId: "fg", bomMode: "OFF" },
      { id: "clip", parentId: "trim", bomMode: null },
    ];
    expect(resolveBomMode("trim", stated).stated).toBe(true);
    // The child follows the owner's OFF rather than reaching past it to RECIPE.
    expect(resolveBomMode("clip", stated)).toEqual({
      mode: "OFF",
      stated: false,
      inheritedFromId: "trim",
    });
  });

  it("gives OFF for a category that is not in the set", () => {
    expect(resolveBomMode("missing", tree)).toEqual({
      mode: "OFF",
      stated: false,
      inheritedFromId: null,
    });
  });

  it("does not read through a parent that is not in the set", () => {
    // An orphan: parentId points at a group this factory cannot see.
    const orphan: BomModeNode[] = [{ id: "x", parentId: "elsewhere", bomMode: null }];
    expect(resolveBomMode("x", orphan).mode).toBe("OFF");
  });

  it("terminates on a cycle instead of spinning", () => {
    const cyclic: BomModeNode[] = [
      { id: "a", parentId: "b", bomMode: null },
      { id: "b", parentId: "a", bomMode: null },
    ];
    expect(resolveBomMode("a", cyclic).mode).toBe("OFF");
  });

  it("still finds a stated mode inside a cycle", () => {
    const cyclic: BomModeNode[] = [
      { id: "a", parentId: "b", bomMode: null },
      { id: "b", parentId: "c", bomMode: "RECIPE" },
      { id: "c", parentId: "a", bomMode: null },
    ];
    expect(resolveBomMode("a", cyclic)).toEqual({
      mode: "RECIPE",
      stated: false,
      inheritedFromId: "b",
    });
  });

  it("terminates on a self-parent", () => {
    const self: BomModeNode[] = [{ id: "a", parentId: "a", bomMode: null }];
    expect(resolveBomMode("a", self).mode).toBe("OFF");
  });
});

describe("bomModeOf", () => {
  it("returns the mode alone", () => {
    expect(bomModeOf("front", tree)).toBe("RECIPE");
    expect(bomModeOf("rm", tree)).toBe("OFF");
  });
});

describe("resolveAllBomModes", () => {
  it("resolves every category in one pass, matching the single-node walk", () => {
    const all = resolveAllBomModes(tree);
    expect(all.size).toBe(tree.length);
    for (const node of tree) {
      expect(all.get(node.id)).toEqual(resolveBomMode(node.id, tree));
    }
  });

  it("is empty for an empty set", () => {
    expect(resolveAllBomModes([]).size).toBe(0);
  });
});
