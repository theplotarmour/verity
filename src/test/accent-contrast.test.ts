import { describe, expect, it } from "vitest";
import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT,
  accentContrast,
  accentStyle,
  contrastRatio,
  onAccentFor,
  resolveAccent,
} from "@/server/platform/accent";

/**
 * The accent is configurable, which means contrast cannot be checked once by
 * hand and declared settled — it has to hold for every preset a user can pick
 * and for any custom hex they type.
 *
 * ADR-011 constraint 1: where a material costs contrast, the material changes
 * and the requirement does not. These assertions are that rule made executable.
 */
describe("accent contrast (ADR-011)", () => {
  it("clears WCAG AA on every preset, in both themes", () => {
    const failures = ACCENT_PRESETS.flatMap((p) => {
      const c = accentContrast(p.hex);
      return [
        ...(c.light.ratio < 4.5 ? [`${p.name} light ${c.light.ratio.toFixed(2)}:1`] : []),
        ...(c.dark.ratio < 4.5 ? [`${p.name} dark ${c.dark.ratio.toFixed(2)}:1`] : []),
      ];
    });
    expect(failures, "accent fills whose label fails AA").toEqual([]);
  });

  it("steps the fill rather than the requirement when the first step fails", () => {
    // Emerald is the proof case. At the 600 step (#1d8d4e) neither ink reaches
    // 4.5:1 — white manages 4.22. The ladder must walk darker until it does.
    const emerald = ACCENT_PRESETS.find((p) => p.name === "Emerald")!;
    const naive = "#1d8d4e";
    expect(Math.max(contrastRatio(naive, "#FFFFFF"), contrastRatio(naive, "#191A1C")))
      .toBeLessThan(4.5);

    const c = accentContrast(emerald.hex);
    expect(c.light.fill).not.toBe(naive);
    expect(c.light.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("picks dark ink for a light accent and light ink for a dark one", () => {
    // Assuming either one universally is the mistake this exists to prevent.
    expect(onAccentFor("#D4A017")).toBe("#191A1C");
    expect(onAccentFor("#4C6FE0")).toBe("#FFFFFF");
  });

  it("holds for arbitrary custom hex values", () => {
    const probes = ["#000000", "#FFFFFF", "#808080", "#FF0000", "#00FF00", "#0000FF", "#7F00FF"];
    for (const hex of probes) {
      const c = accentContrast(hex);
      expect(c.light.ratio, `${hex} light`).toBeGreaterThanOrEqual(4.5);
      expect(c.dark.ratio, `${hex} dark`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("defaults to Warm Sand Gold and rejects malformed input", () => {
    expect(resolveAccent(undefined)).toBe(DEFAULT_ACCENT);
    expect(resolveAccent("not-a-colour")).toBe(DEFAULT_ACCENT);
    expect(resolveAccent("#abc")).toBe(DEFAULT_ACCENT);
    // An unvalidated value would be interpolated into a style attribute.
    expect(resolveAccent("#fff\" onload=alert(1)")).toBe(DEFAULT_ACCENT);
    expect(resolveAccent("#0fa894")).toBe("#0FA894");
  });

  it("emits exactly the five custom properties the stylesheet expects", () => {
    expect(Object.keys(accentStyle(DEFAULT_ACCENT)).sort()).toEqual([
      "--accent-fill-dark",
      "--accent-fill-light",
      "--accent-ink-dark",
      "--accent-ink-light",
      "--accent-seed",
    ]);
  });
});
