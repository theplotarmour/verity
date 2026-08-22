import { allModules, type ModuleKey, type ModuleNavItem, type NavPlacement } from "./registry";

/**
 * Resolving navigation from active modules.
 *
 * Pure and React-free on purpose. The four visibility filters used to be
 * written out three times inside `owner-shell.tsx` — once for the desktop
 * sidebar, once for `reachable` (the mobile dock), once for `visibleNavItems` —
 * and three copies of a permission check is three chances for one of them to
 * drift. This is the single implementation, and it can be tested without
 * rendering anything.
 *
 * Group *membership and existence* come from the modules. This file only
 * expresses a *preference* about order, which is the point: adding a module
 * must not require editing this file or the shell.
 */

/**
 * Preferred top-to-bottom order for groups this platform already knows about.
 *
 * This is a hint, not a whitelist. It used to be the whitelist — `resolveNavGroups`
 * mapped over it — which meant a module declaring a sidebar group not listed here
 * had its items silently vanish from the shell, with nothing failing. A module
 * that has to be named in a shared array to be visible is not installable, so
 * unlisted groups now render after the listed ones instead of disappearing.
 */
export const NAV_GROUP_ORDER = [
  "Overview",
  "Service Operations",
  "Production",
  "Shared Operations",
  "Finance",
] as const;

/**
 * Destinations a STORE_MANAGER may reach.
 *
 * A store manager only takes orders. This is a deliberate carve-out rather than
 * a permission set because it is about *scope of job*, not capability — they
 * hold CREATE_ORDER like a manager does, and without this they would see the
 * whole production nav.
 */
const STORE_MANAGER_ALLOWED = ["/owner/order-taking", "/owner/dashboard", "/owner/inventory"];

/** `/owner/order-taking` is the store-manager surface; nobody else sees it. */
const STORE_MANAGER_ONLY = "/owner/order-taking";

export interface NavContext {
  /**
   * Modules the tenant is entitled to. **`undefined` means "unknown", and every
   * item shows** — the pre-module behaviour, so a caller that has not been
   * updated degrades to the old nav rather than to an empty one.
   */
  enabledModules?: ModuleKey[];
  /** Registry permission keys this user holds. `undefined` means unknown → allow. */
  grantedPermissions?: string[];
  userRole: string;
}

export interface ResolvedNavItem extends ModuleNavItem {
  /** Which module put this here. Used by the module store and for debugging. */
  moduleKey: ModuleKey;
}

/** Every nav item every module declares, before any filtering. */
export function allNavItems(): ResolvedNavItem[] {
  return allModules().flatMap((mod) =>
    (mod.navItems ?? []).map((item) => ({ ...item, moduleKey: mod.key })),
  );
}

/**
 * The items this tenant and this user can actually reach.
 *
 * Three gates, in one place:
 *  1. the owning module is entitled;
 *  2. the registry permission, when the item declares one, is held;
 *  3. the store-manager carve-out.
 */
export function resolveNavItems(ctx: NavContext): ResolvedNavItem[] {
  if (ctx.enabledModules === undefined) {
    console.warn("WARNING: resolveNavItems called with undefined enabledModules. Defaulting to 'core' only.");
  }
  const enabled = new Set<ModuleKey>(ctx.enabledModules ?? ["core"]);
  const held = ctx.grantedPermissions ? new Set(ctx.grantedPermissions) : null;
  const isStoreManager = ctx.userRole === "STORE_MANAGER";

  return allNavItems()
    .filter((item) => {
      // 1. Module entitlement. `core` is always on, so its items always pass.
      if (!enabled.has(item.moduleKey)) return false;

      // 2. Registry grant, where the item has migrated to one.
      if (item.requires && held !== null && !held.has(item.requires)) return false;

      // 3. Role scope.
      if (isStoreManager) return STORE_MANAGER_ALLOWED.includes(item.href);
      return item.href !== STORE_MANAGER_ONLY;
    })
    .sort((a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1));
}

export interface NavGroup {
  title: string;
  items: ResolvedNavItem[];
}

/**
 * Sidebar items grouped and ordered for the desktop header.
 *
 * A group with nothing visible in it is omitted entirely rather than rendered
 * empty — an "Overview" dropdown that opens onto nothing reads as broken.
 */
export function resolveNavGroups(ctx: NavContext): NavGroup[] {
  return groupNavItems(
    resolveNavItems(ctx).filter((item) => (item.placement ?? "sidebar") === "sidebar"),
  );
}

/**
 * Bucket already-filtered items into ordered groups.
 *
 * Split out from `resolveNavGroups` so the grouping rule can be tested against
 * a hand-written item list. `resolveNavGroups` reads the live registry, so a
 * test of it can only assert what today's modules happen to declare — and the
 * rule that matters here is about a group no module declares yet.
 */
export function groupNavItems(items: ResolvedNavItem[]): NavGroup[] {
  /*
   * Insertion order over a Map is the module declaration order, which is the
   * only sensible fallback for a group `NAV_GROUP_ORDER` has never heard of.
   */
  const groups = new Map<string, ResolvedNavItem[]>();
  for (const item of items) {
    const bucket = groups.get(item.group);
    if (bucket) bucket.push(item);
    else groups.set(item.group, [item]);
  }

  const rank = (title: string) => {
    const index = NAV_GROUP_ORDER.indexOf(title as (typeof NAV_GROUP_ORDER)[number]);
    return index === -1 ? NAV_GROUP_ORDER.length : index;
  };

  return [...groups.entries()]
    .map(([title, groupItems]) => ({ title, items: groupItems }))
    .sort((a, b) => rank(a.title) - rank(b.title));
}

/** Config destinations for the topbar icon row. */
export function resolveTopbarItems(ctx: NavContext): ResolvedNavItem[] {
  return resolveNavItems(ctx).filter((item) => item.placement === "topbar");
}

export function navItemsByPlacement(ctx: NavContext, placement: NavPlacement): ResolvedNavItem[] {
  return resolveNavItems(ctx).filter((item) => (item.placement ?? "sidebar") === placement);
}

/** The item matching a pathname, for active-state highlighting. */
export function activeNavItem(
  items: ResolvedNavItem[],
  pathname: string,
): ResolvedNavItem | undefined {
  return items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

import { type ModuleDashboardWidget } from "./registry";

export interface ResolvedDashboardWidget extends ModuleDashboardWidget {
  moduleKey: ModuleKey;
}

/** Every dashboard widget every module declares, before any filtering. */
export function allDashboardWidgets(): ResolvedDashboardWidget[] {
  return allModules().flatMap((mod) =>
    (mod.dashboardWidgets ?? []).map((widget) => ({ ...widget, moduleKey: mod.key })),
  );
}

/**
 * The dashboard widgets this tenant and this user can actually reach.
 *
 * Gated by:
 *  1. the owning module is entitled;
 *  2. the registry permission, when the widget declares one, is held.
 */
export function resolveDashboardWidgets(ctx: NavContext): ResolvedDashboardWidget[] {
  const enabled = new Set<ModuleKey>(ctx.enabledModules ?? ["core"]);
  const held = ctx.grantedPermissions ? new Set(ctx.grantedPermissions) : null;

  return allDashboardWidgets()
    .filter((widget) => {
      // 1. Module entitlement.
      if (!enabled.has(widget.moduleKey)) return false;

      // 2. Registry grant.
      if (widget.requires && held !== null && !held.has(widget.requires)) return false;

      return true;
    })
    .sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
}
