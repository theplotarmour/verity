import { describe, it, expect } from "vitest";

import {
  NAV_GROUP_ORDER,
  allNavItems,
  resolveNavGroups,
  resolveNavItems,
  resolveTopbarItems,
} from "./navigation";
import { allModules, type ModuleKey } from "./registry";

/**
 * Navigation visibility.
 *
 * The nav moved out of `owner-shell.tsx`, where the four filters were written
 * three times over. A refactor of permission logic that silently *widens* access
 * is the worst possible outcome and the one nothing would report: the app looks
 * fine, and a store manager can see the production floor.
 *
 * So these assert the invariants rather than a golden list of hrefs. A snapshot
 * would tell you something changed; an invariant tells you what rule broke.
 */

/** Allow everything, so a test can isolate one gate at a time. */
const permissive = {
  userRole: "OWNER",
  can: () => true,
};

const ALL_MODULES = allModules().map((m) => m.key);

describe("module ownership", () => {
  it("every nav item belongs to a real module", () => {
    const keys = new Set<string>(ALL_MODULES);
    for (const item of allNavItems()) {
      expect(keys.has(item.moduleKey), `${item.href} claims module ${item.moduleKey}`).toBe(true);
    }
  });

  it("declares no duplicate destinations", () => {
    // Two modules owning one href means deactivating one leaves the link, which
    // then 404s or redirects — a dead entry that looks live.
    const hrefs = allNavItems().map((i) => i.href);
    expect(hrefs.length).toBe(new Set(hrefs).size);
  });

  it("puts every item in a known group", () => {
    const known = new Set<string>([...NAV_GROUP_ORDER, "Configure"]);
    for (const item of allNavItems()) {
      expect(known.has(item.group), `${item.href} is in unknown group "${item.group}"`).toBe(true);
    }
  });

  it("contributes a meaningful number of destinations", () => {
    // Tripwire: if the registry stopped declaring nav, every test below would
    // pass vacuously on an empty list.
    expect(allNavItems().length).toBeGreaterThanOrEqual(16);
  });
});

describe("module entitlement gate", () => {
  it("hides a module's destinations when it is not entitled", () => {
    const withHelpdesk = resolveNavItems({ ...permissive, enabledModules: ["core", "helpdesk"] });
    const without = resolveNavItems({ ...permissive, enabledModules: ["core"] });

    expect(withHelpdesk.map((i) => i.href)).toContain("/owner/helpdesk");
    expect(without.map((i) => i.href)).not.toContain("/owner/helpdesk");
  });

  it("removes exactly the deactivated module's items and nothing else", () => {
    // The failure this guards: a filter that removes one module's links and
    // quietly takes a neighbour's with it.
    const all = resolveNavItems({ ...permissive, enabledModules: ALL_MODULES });
    const withoutSites = resolveNavItems({
      ...permissive,
      enabledModules: ALL_MODULES.filter((k) => k !== "sites"),
    });

    const removed = all
      .filter((i) => !withoutSites.some((w) => w.href === i.href))
      .map((i) => i.href);

    const sitesOwns = allNavItems()
      .filter((i) => i.moduleKey === "sites")
      .map((i) => i.href);

    expect(removed.sort()).toEqual(sitesOwns.sort());
  });

  it("keeps core's destinations regardless of what else is off", () => {
    const items = resolveNavItems({ ...permissive, enabledModules: ["core"] });
    expect(items.map((i) => i.href)).toContain("/owner/dashboard");
    expect(items.map((i) => i.href)).toContain("/owner/settings");
  });

  it("shows everything when entitlements are unknown", () => {
    // Degrade to the pre-module behaviour rather than to an empty nav. A caller
    // that has not been updated must not lock its users out.
    const unknown = resolveNavItems(permissive);
    expect(unknown.length).toBe(allNavItems().length - 1); // minus order-taking, see below
  });
});

describe("permission gates", () => {
  it("hides an item whose registry grant is not held", () => {
    const withGrant = resolveNavItems({
      ...permissive,
      enabledModules: ALL_MODULES,
      grantedPermissions: ["ticket.view"],
    });
    expect(withGrant.map((i) => i.href)).toContain("/owner/helpdesk");
    // site.view was not granted, so Sites is out even though `sites` is entitled.
    expect(withGrant.map((i) => i.href)).not.toContain("/owner/sites");
  });

  it("hides an item whose legacy permission fails", () => {
    const noReports = resolveNavItems({
      userRole: "OWNER",
      enabledModules: ALL_MODULES,
      can: (p) => p !== "VIEW_REPORTS",
    });
    expect(noReports.map((i) => i.href)).not.toContain("/owner/reports");
  });

  it("shows items with no registry grant when grants are unknown", () => {
    const items = resolveNavItems({ ...permissive, enabledModules: ALL_MODULES });
    expect(items.map((i) => i.href)).toContain("/owner/sites");
  });
});

describe("store manager scope", () => {
  const storeManager = {
    userRole: "STORE_MANAGER",
    enabledModules: ALL_MODULES,
    can: () => true,
  };

  it("sees only order taking, dashboard and inventory", () => {
    // The carve-out that must survive the refactor. A store manager with the
    // full production nav is a real access change, and nothing would report it.
    const hrefs = resolveNavItems(storeManager).map((i) => i.href).sort();
    expect(hrefs).toEqual(["/owner/dashboard", "/owner/inventory", "/owner/order-taking"]);
  });

  it("does not gain destinations from having every module entitled", () => {
    const everything = resolveNavItems(storeManager);
    const minimal = resolveNavItems({ ...storeManager, enabledModules: ["core", "inventory", "sales"] });
    expect(everything.map((i) => i.href).sort()).toEqual(minimal.map((i) => i.href).sort());
  });
});

describe("order taking is store-manager only", () => {
  it("is hidden from every other role", () => {
    for (const userRole of ["OWNER", "CO_OWNER", "MANAGER", "SUPERVISOR", "WORKER"]) {
      const hrefs = resolveNavItems({ userRole, enabledModules: ALL_MODULES, can: () => true }).map(
        (i) => i.href,
      );
      expect(hrefs, `${userRole} can see order taking`).not.toContain("/owner/order-taking");
    }
  });
});

describe("grouping", () => {
  it("orders groups as configured and omits empty ones", () => {
    const groups = resolveNavGroups({ ...permissive, enabledModules: ["core"] });
    const titles = groups.map((g) => g.title);

    // Order preserved…
    expect(titles).toEqual(NAV_GROUP_ORDER.filter((t) => titles.includes(t)));
    // …and a group nobody contributes to is absent, not empty.
    for (const group of groups) expect(group.items.length).toBeGreaterThan(0);
    expect(titles).not.toContain("Service Operations");
  });

  it("keeps topbar items out of the sidebar groups", () => {
    const groups = resolveNavGroups({ ...permissive, enabledModules: ALL_MODULES });
    const sidebarHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(sidebarHrefs).not.toContain("/owner/settings");

    const topbar = resolveTopbarItems({ ...permissive, enabledModules: ALL_MODULES }).map(
      (i) => i.href,
    );
    expect(topbar).toContain("/owner/settings");
    expect(topbar).toContain("/owner/team");
  });
});
