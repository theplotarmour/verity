import { describe, it, expect } from "vitest";

import {
  allDashboardWidgets,
  resolveDashboardWidgets,
} from "./navigation";
import { allModules } from "./registry";

const ALL_MODULES = allModules().map((m) => m.key);

const permissive = {
  userRole: "OWNER",
  grantedPermissions: undefined,
};

describe("dashboard widget registry", () => {
  it("every widget belongs to a real module", () => {
    const keys = new Set<string>(ALL_MODULES);
    for (const widget of allDashboardWidgets()) {
      expect(keys.has(widget.moduleKey), `widget ${widget.key} claims module ${widget.moduleKey}`).toBe(true);
    }
  });

  it("declares no duplicate widget keys", () => {
    const keys = allDashboardWidgets().map((w) => w.key);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it("resolves zero widgets for a blank tenant with core only", () => {
    const resolved = resolveDashboardWidgets({
      userRole: "OWNER",
      enabledModules: ["core"],
    });
    expect(resolved.length).toBe(0);
  });

  it("resolves all widgets when all modules are enabled", () => {
    const resolved = resolveDashboardWidgets({
      ...permissive,
      enabledModules: ALL_MODULES,
    });
    expect(resolved.length).toBeGreaterThan(0);
    const keys = resolved.map((w) => w.key);
    expect(keys).toContain("restaurant_floor");
    expect(keys).toContain("restaurant_takings");
  });
});

describe("widget permission gates", () => {
  it("hides a widget whose registry grant is not held", () => {
    // restaurant_takings requires "invoice.view"
    const withGrant = resolveDashboardWidgets({
      userRole: "OWNER",
      enabledModules: ALL_MODULES,
      grantedPermissions: ["invoice.view"],
    });
    const without = resolveDashboardWidgets({
      userRole: "OWNER",
      enabledModules: ALL_MODULES,
      grantedPermissions: ["dashboard.view"],
    });

    expect(withGrant.map((w) => w.key)).toContain("restaurant_takings");
    expect(without.map((w) => w.key)).not.toContain("restaurant_takings");
  });
});
