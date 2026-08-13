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
 * Group *order* stays configuration here. Group *membership* comes from the
 * modules, which is the point: adding a module must not require editing this
 * file or the shell.
 */

/** Desktop group order. A group nobody contributes to is not rendered. */
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
  /** Legacy permission check, injected so this module stays free of that import. */
  can: (permission: string) => boolean;
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
 * All four gates, in one place:
 *  1. the owning module is entitled;
 *  2. the registry permission, when the item declares one, is held;
 *  3. the legacy permission passes;
 *  4. the store-manager carve-out.
 */
export function resolveNavItems(ctx: NavContext): ResolvedNavItem[] {
  const enabled = new Set<ModuleKey>(ctx.enabledModules ?? ["core"]);
  const held = ctx.grantedPermissions ? new Set(ctx.grantedPermissions) : null;
  const isStoreManager = ctx.userRole === "STORE_MANAGER";

  return allNavItems()
    .filter((item) => {
      // 1. Module entitlement. `core` is always on, so its items always pass.
      if (!enabled.has(item.moduleKey)) return false;

      // 2. Registry grant, where the item has migrated to one.
      if (item.requires && held !== null && !held.has(item.requires)) return false;

      // 3. Legacy permission union.
      if (!ctx.can(item.permission)) return false;

      // 4. Role scope.
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
  const items = resolveNavItems(ctx).filter((item) => (item.placement ?? "sidebar") === "sidebar");

  return NAV_GROUP_ORDER.map((title) => ({
    title,
    items: items.filter((item) => item.group === title),
  })).filter((group) => group.items.length > 0);
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
