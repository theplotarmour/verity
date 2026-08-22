import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { VERTICAL_PACKS, resolvePackKey } from "@/platform/tenancy/packs";

/**
 * Dashboard routing.
 *
 * The spec's acceptance criterion is that changing a tenant's industry to
 * `franchise_qsr` renders the QSR dashboard. The switch that does this reads a
 * free-text column, so the two ways it breaks are: a pack gains a dashboard but
 * not a case (falls through to auto components, silently), or the column holds a
 * label rather than a key and nothing matches.
 *
 * Read structurally rather than by rendering, because rendering needs a request
 * context and a database — the same constraint as orders.test.ts.
 */

const ROUTE = path.resolve(__dirname, "page.tsx");

describe("dashboard routing", () => {
  const source = readFileSync(ROUTE, "utf8");

  it("has a case for every vertical pack", () => {
    /*
     * The failure this catches: adding a pack, building its dashboard, and
     * forgetting the case — which lands those tenants on the default with no
     * error anywhere.
     *
     * facility_management is exempt: it *is* the default, so writing a case for
     * it would be a second branch to the same component.
     */
    const missing = Object.keys(VERTICAL_PACKS)
      .filter((key) => key !== "facility_management")
      .filter((key) => !source.includes(`case "${key}"`));
    expect(
      missing,
      `Packs with no dashboard case (they fall through to the default): ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("mounts a distinct component per vertical", () => {
    for (const component of [
      "FacilityManagementDashboard",
      "QsrFranchiseDashboard",
      "RetailFranchiseDashboard",
    ]) {
      expect(source, `${component} is imported but never mounted`).toContain(`<${component} `);
    }
  });

  it("routes through resolvePackKey rather than comparing industry directly", () => {
    // A direct `factory.industry === "franchise_qsr"` would work for new tenants
    // and silently fail for every existing one, whose column holds a label.
    expect(source).toContain("resolvePackKey");
    expect(source).not.toMatch(/industry\s*===/);
  });

  it("falls back rather than rendering nothing for an unrecognised industry", () => {
    expect(source).toContain("default:");
  });
});

describe("industry values route to the right dashboard", () => {
  it.each([
    ["franchise_qsr", "franchise_qsr"],
    ["franchise_retail", "franchise_retail"],
    ["facility_management", "facility_management"],
    ["Facility Management", "facility_management"], // Sentinel's stored label
    ["Security Services", "facility_management"], // Asian Security, retired pack
    ["auto_components", "franchise_retail"],
  ])("%s resolves to %s", (industry, expected) => {
    expect(resolvePackKey(industry)).toBe(expected);
  });

  it("leaves an unrecognised industry unrouted, for the default to catch", () => {
    expect(resolvePackKey("Software")).toBeNull();
    expect(resolvePackKey(null)).toBeNull();
  });
});
