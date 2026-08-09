import { describe, it, expect } from "vitest";
import { computeDropdownPlacement } from "./dropdown-position";

const anchor = (top: number, height = 44) => ({
  top,
  bottom: top + height,
  left: 100,
  width: 200,
});

describe("computeDropdownPlacement", () => {
  it("opens below when there is room", () => {
    const p = computeDropdownPlacement(anchor(100), 800, 256);
    expect(p.placement).toBe("below");
    expect(p.top).toBe(148); // anchor bottom + 4px gap
    expect(p.maxHeight).toBe(256);
  });

  it("flips above when the anchor is near the bottom edge", () => {
    // Anchor at 700 in an 800px viewport leaves 56px below, 700px above.
    const p = computeDropdownPlacement(anchor(700), 800, 256);
    expect(p.placement).toBe("above");
  });

  it("sits the flipped list directly on top of the anchor", () => {
    const p = computeDropdownPlacement(anchor(700), 800, 256);
    expect(p.top + p.maxHeight).toBe(696); // anchor top - 4px gap
  });

  it("shrinks to the space available rather than overflowing", () => {
    const p = computeDropdownPlacement(anchor(600), 800, 256);
    expect(p.maxHeight).toBeLessThanOrEqual(256);
    expect(p.top + p.maxHeight).toBeLessThanOrEqual(800);
  });

  it("stays below when neither side fits but below is roomier", () => {
    // Anchor at 20 in a 200px tall viewport: 136 below, 20 above.
    const p = computeDropdownPlacement(anchor(20), 200, 256);
    expect(p.placement).toBe("below");
  });

  it("tracks the anchor's horizontal position and width", () => {
    const p = computeDropdownPlacement(anchor(100), 800, 256);
    expect(p.left).toBe(100);
    expect(p.width).toBe(200);
  });

  it("never returns a negative or zero height", () => {
    const p = computeDropdownPlacement(anchor(795), 800, 256);
    expect(p.maxHeight).toBeGreaterThan(0);
  });
});
