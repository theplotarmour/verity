import { describe, it, expect } from "vitest";
import {
  VERTICAL_PACKS,
  modulesForPack,
  packLabel,
  resolvePackKey,
  verticalPackOptions,
} from "./packs";

/**
 * The pack list was narrowed from twenty-two to four. Narrowing a list of keys
 * that live rows already point at is the kind of change that looks free and
 * isn't: nothing throws, entitlements are untouched, and the only symptom is a
 * tenant quietly resolving to no pack and landing on a generic dashboard.
 *
 * These tests pin the two halves of that: the offer is exactly four, and every
 * value a live `Factory.industry` actually holds still resolves.
 */

/**
 * The supported packs, as a closed allowlist.
 *
 * The count is not the point — a deliberate list is. Restaurant OS was the fifth,
 * added because a customer asked for it, which is the bar `packs.ts` sets for
 * itself. Adding a fifth should mean editing this line and noticing that a pack
 * without a dashboard case falls through to a factory floor.
 */
const SUPPORTED_PACKS = [
  "auto_components",
  "facility_management",
  "franchise_qsr",
  "franchise_retail",
];

describe("vertical packs", () => {
  it("offers exactly the supported verticals", () => {
    expect(Object.keys(VERTICAL_PACKS).sort()).toEqual([...SUPPORTED_PACKS].sort());
  });

  it("does not offer retired packs in the selector", () => {
    const offered = verticalPackOptions().map((p) => p.key);
    expect(offered).not.toContain("security_services");
    // Derived from the allowlist above, so the two assertions cannot drift apart.
    expect(offered).toHaveLength(SUPPORTED_PACKS.length);
  });

  it("every pack resolves to a non-empty module set including core", () => {
    for (const key of Object.keys(VERTICAL_PACKS)) {
      const modules = modulesForPack(key);
      expect(modules, `${key} resolved to nothing`).not.toHaveLength(0);
      expect(modules, `${key} is missing core`).toContain("core");
    }
  });
});

describe("resolvePackKey", () => {
  // These are the literal values in the industry column as of this change.
  // If a live tenant stops resolving, that is a regression, not a rename.
  it.each([
    ["Facility Management", "facility_management"], // Sentinel — label form
    ["Security Services", "facility_management"], // Asian Security — retired pack
    ["facility_management", "facility_management"], // new tenants — key form
    ["franchise_qsr", "franchise_qsr"],
    ["Franchise — QSR", "franchise_qsr"], // em dash in the label
    ["auto_components", "auto_components"],
    ["garments_textiles", "auto_components"], // retired production pack
  ])("resolves %s to %s", (industry, expected) => {
    expect(resolvePackKey(industry)).toBe(expected);
  });

  it("returns null for values that are not verticals", () => {
    expect(resolvePackKey("Software")).toBeNull(); // PlotArmour, the operator org
    expect(resolvePackKey(null)).toBeNull();
    expect(resolvePackKey("")).toBeNull();
  });

  it("gives a retired key the modules of its successor, not the defaults", () => {
    // The failure this guards: falling through to DEFAULT_MODULES would hand a
    // security company the manufacturing bundle and no sites module.
    const modules = modulesForPack("security_services");
    expect(modules).toContain("sites");
    expect(modules).not.toContain("manufacturing");
  });
});

describe("packLabel", () => {
  it("renders stored keys as human labels", () => {
    expect(packLabel("franchise_retail")).toBe("Franchise — Retail");
    expect(packLabel("facility_management")).toBe("Facility Management");
  });

  it("renders a retired key as the pack that now covers it", () => {
    expect(packLabel("security_services")).toBe("Facility Management");
  });

  it("passes through free text rather than swallowing it", () => {
    // Better to show an operator "Software" than an empty cell.
    expect(packLabel("Software")).toBe("Software");
    expect(packLabel(null)).toBeNull();
  });
});
