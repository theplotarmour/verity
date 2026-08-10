import { describe, it, expect } from "vitest";
import { resolveBomModeFromTree, bomEnabled, type BomModeNode } from "./bom-mode";

/**
 * `bomMode` went from non-null-with-a-default to nullable, and null changed
 * meaning: it used to be impossible, now it means "inherit". Every site that
 * read `bomMode ?? "OFF"` became wrong at that moment, silently — a child of a
 * RECIPE category would render with no BOM editor and no error.
 *
 * These pin the walk itself. The read sites were converted to call it.
 */

const tree: BomModeNode[] = [
  { id: "root-fg", parentId: null, bomMode: "RECIPE" },
  { id: "seat-covers", parentId: "root-fg", bomMode: null }, // inherits RECIPE
  { id: "bucket", parentId: "seat-covers", bomMode: null }, // inherits through two levels
  { id: "bench", parentId: "seat-covers", bomMode: "OFF" }, // explicitly opts out
  { id: "bench-child", parentId: "bench", bomMode: null }, // inherits the opt-out
  { id: "root-raw", parentId: null, bomMode: null }, // root with nothing set
  { id: "fabric", parentId: "root-raw", bomMode: "INGREDIENTS" },
];

describe("resolveBomModeFromTree", () => {
  it("returns a category's own mode when it has one", () => {
    expect(resolveBomModeFromTree("root-fg", tree)).toBe("RECIPE");
    expect(resolveBomModeFromTree("fabric", tree)).toBe("INGREDIENTS");
  });

  it("inherits from the parent", () => {
    expect(resolveBomModeFromTree("seat-covers", tree)).toBe("RECIPE");
  });

  it("inherits through more than one level", () => {
    // The case the whole feature exists for: set it once at the top.
    expect(resolveBomModeFromTree("bucket", tree)).toBe("RECIPE");
  });

  it("lets a child explicitly opt out of an inherited mode", () => {
    // OFF is a decision, and it has to beat the parent's RECIPE. If OFF and
    // null were treated alike this would wrongly return RECIPE.
    expect(resolveBomModeFromTree("bench", tree)).toBe("OFF");
    expect(resolveBomModeFromTree("bench-child", tree)).toBe("OFF");
  });

  it("falls back to OFF when nobody up the chain has stated one", () => {
    expect(resolveBomModeFromTree("root-raw", tree)).toBe("OFF");
  });

  it("returns OFF for an unknown or missing id rather than throwing", () => {
    // A page can render mid-navigation with no category selected.
    expect(resolveBomModeFromTree(null, tree)).toBe("OFF");
    expect(resolveBomModeFromTree(undefined, tree)).toBe("OFF");
    expect(resolveBomModeFromTree("does-not-exist", tree)).toBe("OFF");
  });

  it("treats undefined the same as null", () => {
    const withUndefined: BomModeNode[] = [
      { id: "a", parentId: null, bomMode: "RECIPE" },
      { id: "b", parentId: "a" }, // bomMode omitted entirely
    ];
    expect(resolveBomModeFromTree("b", withUndefined)).toBe("RECIPE");
  });

  it("terminates on a cycle instead of hanging the render", () => {
    // Not reachable through the UI, but an infinite loop here freezes a server
    // render rather than throwing, which is the worst way to find out.
    const cyclic: BomModeNode[] = [
      { id: "x", parentId: "y", bomMode: null },
      { id: "y", parentId: "x", bomMode: null },
    ];
    expect(resolveBomModeFromTree("x", cyclic)).toBe("OFF");
  });
});

describe("bomEnabled", () => {
  it("is true for both editing modes and false only for OFF", () => {
    expect(bomEnabled("RECIPE")).toBe(true);
    expect(bomEnabled("INGREDIENTS")).toBe(true);
    expect(bomEnabled("OFF")).toBe(false);
  });
});
