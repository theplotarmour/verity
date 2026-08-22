import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Contrast floors for the brand tokens.
 *
 * A colour change is the easiest thing in this codebase to make and the hardest
 * to notice going wrong: nothing throws, the build passes, and the person who
 * finds out is a user standing outside in daylight who cannot see the edge of a
 * text field.
 *
 * The floor held here is WCAG 1.4.11 — 3:1 for the boundary of a *control*.
 * Card edges are deliberately not held to it: 1.4.11 covers "visual information
 * required to identify user interface components and their states", and a
 * decorative container edge identifies no control. They are still checked, at a
 * lower bar, because the failure mode this guards against is somebody dropping
 * them to the 0.06 alpha a glass mock reaches for, which measures 1.05:1.
 */

const CSS = readFileSync(path.resolve(__dirname, "globals.css"), "utf8");

function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite a white overlay at `alpha` over an opaque base, as a browser does. */
function whiteOver(alpha: number, baseHex: string): string {
  const clean = baseHex.replace("#", "");
  const mixed = [0, 2, 4]
    .map((i) => parseInt(clean.slice(i, i + 2), 16))
    .map((v) => Math.round(v + alpha * (255 - v)));
  return `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Read a custom property out of a named block in globals.css. */
function token(block: ":root" | ".dark", name: string): string {
  const start = CSS.indexOf(`${block} {`);
  expect(start, `${block} block not found in globals.css`).toBeGreaterThan(-1);
  const body = CSS.slice(start, CSS.indexOf("\n}", start));
  const match = body.match(new RegExp(`${name}:\\s*([^;]+);`));
  expect(match, `${name} not found in ${block}`).not.toBeNull();
  return match![1].trim();
}

function alphaOf(rgba: string): number {
  const match = rgba.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
  expect(match, `expected an rgba() value, got ${rgba}`).not.toBeNull();
  return Number(match![1]);
}

describe("light theme", () => {
  const cardSurface = "#FFFFFF";

  it("control borders clear the 3:1 floor", () => {
    // Inputs, selects, buttons. This was rgba(0,0,0,0.08) — about 1.1:1, which
    // is why an empty text field was near-invisible on this theme.
    expect(contrast(token(":root", "--border"), cardSurface)).toBeGreaterThanOrEqual(3);
  });

  it("card edges stay clearly visible even though 1.4.11 does not cover them", () => {
    const ratio = contrast(token(":root", "--glass-border"), cardSurface);
    expect(ratio).toBeGreaterThanOrEqual(2);
    // If this ever drops near 1.05 someone has reached for a 0.06-alpha glass
    // border, which is invisible in daylight.
    expect(ratio).toBeGreaterThan(1.5);
  });

  it("the accent clears 4.5:1 on white, which is why it is not #FF102A", () => {
    // The brand sheet's scarlet measures about 3.6:1 here. The deeper #E11D2A
    // is deliberate and this test is the reason it cannot drift back.
    expect(contrast(token(":root", "--accent"), cardSurface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("dark theme", () => {
  const cardSurface = "#141416";

  it("control borders clear the 3:1 floor", () => {
    const composited = whiteOver(alphaOf(token(".dark", "--border")), cardSurface);
    expect(contrast(composited, cardSurface)).toBeGreaterThanOrEqual(3);
  });

  it("card edges stay clearly visible", () => {
    const composited = whiteOver(alphaOf(token(".dark", "--glass-border")), cardSurface);
    expect(contrast(composited, cardSurface)).toBeGreaterThanOrEqual(2);
  });

  it("uses the brand sheet's exact scarlet, which is specified against black", () => {
    expect(token(".dark", "--accent").toUpperCase()).toBe("#FF102A");
  });
});

describe("the glow is decoration, never the boundary", () => {
  it("cards carry a real border independent of the hover state", () => {
    // A card whose edge only exists on hover has no edge on a touch screen.
    const rule = CSS.slice(CSS.indexOf(".verity-glass {"), CSS.indexOf(".verity-glass::before"));
    expect(rule).toMatch(/border:\s*1px solid var\(--glass-border\)/);
  });

  it("respects prefers-reduced-motion", () => {
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?verity-glass/);
  });
});
