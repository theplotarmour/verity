import { describe, it, expect } from "vitest";
import { resolveNavItems } from "../modules/navigation";
import { allNavItems } from "../modules/navigation";
import type { ModuleKey } from "../modules/registry";

describe("Blank Tenant Boundary Invariants", () => {
  const permissiveContext = {
    userRole: "OWNER",
    can: () => true,
  };

  it("resolveNavItems with only core enabled returns only core nav items", () => {
    // A blank tenant has only the core module enabled.
    const items = resolveNavItems({
      ...permissiveContext,
      enabledModules: ["core"],
    });

    const nonCore = items.filter((item) => item.moduleKey !== "core");
    expect(nonCore, "A blank tenant with only core enabled should see zero non-core nav items").toEqual([]);

    // Check that core routes are still returned
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toContain("/owner/dashboard");
    expect(hrefs).toContain("/owner/settings");
  });

  it("fails closed (only core) when enabledModules is completely empty", () => {
    const items = resolveNavItems({
      ...permissiveContext,
      enabledModules: [],
    });
    const nonCore = items.filter((item) => item.moduleKey !== "core");
    expect(nonCore).toEqual([]);
  });

  it("asserts that all optional pages mapped in the project belong to optional modules", () => {
    const optionalModules = new Set<ModuleKey>([
      "inventory",
      "manufacturing",
      "quality",
      "procurement",
      "sales",
      "crm",
      "hr",
      "finance",
      "projects",
      "assets",
      "helpdesk",
      "sites",
      "scheduling",
      "billing",
      "automotive",
      "menu",
      "tables_orders",
      "kitchen",
      "serving",
    ]);

    const items = allNavItems();
    for (const item of items) {
      if (item.moduleKey !== "core") {
        expect(optionalModules.has(item.moduleKey), `${item.href} claims unknown module key ${item.moduleKey}`).toBe(true);
      }
    }
  });
});
