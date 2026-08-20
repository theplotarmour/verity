import { describe, it, expect } from "vitest";

import {
  isLegacyPermissionActive,
  isRegistryPermissionActive,
  legacyPermissionModule,
  registryPermissionModule,
  scopeLegacyPermissions,
  scopedPermissionGroups,
  scopedPermissionKeys,
  staleGrants,
} from "./permission-scope";
import { allModules, type ModuleKey } from "./registry";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { VERTICAL_PACKS } from "@/platform/tenancy/packs";
import { withDependencies } from "./registry";

/**
 * Scoping permissions to active modules.
 *
 * The two failure directions are not symmetric, and that asymmetry is the whole
 * design.
 *
 * Showing a permission a tenant cannot use is untidy: a switch that does nothing,
 * implying the feature merely needs enabling.
 *
 * *Hiding* one they need is a lockout. An owner cannot grant what the matrix does
 * not render, so their staff lose a screen the tenant is paying for, and the
 * only symptom is a support ticket that says "Priya can't see the helpdesk".
 *
 * So the tests below lean hard on the second: every pack must still be able to
 * grant every permission its own nav depends on.
 */

const FM = withDependencies(VERTICAL_PACKS.facility_management.modules);
const QSR = withDependencies(VERTICAL_PACKS.franchise_qsr.modules);
const RETAIL = withDependencies(VERTICAL_PACKS.franchise_retail.modules);

describe("legacy permission mapping", () => {
  it("maps every permission in the union", () => {
    // An unmapped permission silently becomes core, which is safe but hides the
    // decision. This asserts the decision was made.
    for (const permission of ALL_PERMISSIONS) {
      expect(legacyPermissionModule(permission)).toBeTruthy();
    }
  });

  it("keeps CREATE_ORDER available to every pack", () => {
    // It reads like a sales permission and gates twelve destinations —
    // helpdesk, sites, projects, scheduling, purchase, assets, billing.
    // Scoping it to `sales` would remove a facility-management tenant's ability
    // to grant access to their own helpdesk.
    for (const [name, modules] of [["FM", FM], ["QSR", QSR], ["retail", RETAIL]] as const) {
      expect(
        isLegacyPermissionActive("CREATE_ORDER", modules as ModuleKey[]),
        `${name} cannot grant CREATE_ORDER`,
      ).toBe(true);
    }
  });

  it("keeps platform administration available to every pack", () => {
    const administrative = [
      "ACCESS_SETTINGS",
      "MANAGE_TEAM",
      "ASSIGN_ROLES",
      "TRANSFER_OWNERSHIP",
      "VIEW_DASHBOARD",
      "VIEW_REPORTS",
    ];
    for (const permission of administrative) {
      for (const modules of [FM, QSR, RETAIL]) {
        expect(
          isLegacyPermissionActive(permission, modules as ModuleKey[]),
          `${permission} is not grantable`,
        ).toBe(true);
      }
    }
  });

  it("hides genuinely module-specific permissions from a tenant without the module", () => {
    /*
     * Asserted against a hand-written module set rather than a pack.
     *
     * It used to compare facility management (no manufacturing, so no "Work
     * assigned jobs") against auto components (which had it). Manufacturing is
     * gone, and every surviving pack carries billing, sales and quality - which
     * are the only modules the remaining legacy permissions map to. So no pack
     * hides anything, and a test phrased in packs could only assert that.
     *
     * A tenant *can* still be entitled to less than a pack: the HQ builder sets
     * modules directly. That is the case this covers.
     */
    const lean: ModuleKey[] = ["core", "hr"];
    expect(isLegacyPermissionActive("DELETE_ORDER", lean)).toBe(false);

    // …and a tenant with sales keeps it.
    expect(RETAIL).toContain("sales");
    expect(isLegacyPermissionActive("DELETE_ORDER", RETAIL as ModuleKey[])).toBe(true);
  });

  it("shows everything when entitlements are unknown", () => {
    // Degrade to the old behaviour rather than stripping an owner's controls.
    expect(scopeLegacyPermissions(ALL_PERMISSIONS, undefined)).toEqual(ALL_PERMISSIONS);
  });

  it("hides something for a lean tenant, so the filter is not inert", () => {
    // Tripwire: if every permission mapped to core, every test above would pass
    // while the filter did nothing. Phrased against a lean module set for the
    // reason given above - no surviving pack is narrow enough to hide anything.
    const shown = scopeLegacyPermissions(ALL_PERMISSIONS, ["core", "hr"]);
    expect(shown.length).toBeLessThan(ALL_PERMISSIONS.length);
    expect(shown.length).toBeGreaterThan(0);
  });
});

describe("registry permission groups", () => {
  it("offers only active modules' groups", () => {
    const groups = scopedPermissionGroups(["core", "quality"]);
    const keys = groups.map((g) => g.moduleKey);
    expect(keys).toContain("core");
    expect(keys).toContain("quality");
    expect(keys).not.toContain("manufacturing");
  });

  it("always includes core, whatever else is off", () => {
    const groups = scopedPermissionGroups(["core"]);
    expect(groups.some((g) => g.moduleKey === "core")).toBe(true);
  });

  it("resolves the owning module for every registry key", () => {
    for (const mod of allModules()) {
      for (const permission of mod.permissions) {
        expect(registryPermissionModule(permission.key)).toBe(mod.key);
      }
    }
  });

  it("returns null for a key no module declares", () => {
    expect(registryPermissionModule("nonsense.key")).toBeNull();
    expect(isRegistryPermissionActive("nonsense.key", ["core"])).toBe(false);
  });

  it("covers a meaningful number of keys", () => {
    expect(scopedPermissionKeys(undefined).length).toBeGreaterThan(40);
  });
});

describe("stale grants are reported, not destroyed", () => {
  it("names grants belonging to an inactive module", () => {
    // Deactivating Billing for a month must not silently cost everyone their
    // invoice access when it returns, so the grant is kept and surfaced.
    const held = ["dashboard.view", "invoice.view"];
    const stale = staleGrants(held, ["core"]);
    expect(stale).toContain("invoice.view");
    expect(stale).not.toContain("dashboard.view");
  });

  it("ignores keys the registry does not know", () => {
    // A key from a deleted module is a different problem, and reporting it here
    // would be noise an operator cannot act on.
    expect(staleGrants(["ancient.permission"], ["core"])).toEqual([]);
  });

  it("reports nothing when entitlements are unknown", () => {
    expect(staleGrants(["invoice.view"], undefined)).toEqual([]);
  });
});
