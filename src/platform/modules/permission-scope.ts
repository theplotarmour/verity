import {
  allModules,
  alwaysOnModules,
  getModule,
  type ModuleKey,
  type ModulePermission,
} from "./registry";

/**
 * Which permissions a tenant should be offered.
 *
 * A role editor listing grants for modules the tenant does not have is a list of
 * switches that do nothing. Worse, it implies the feature exists and is merely
 * switched off, so an owner grants "Perform inspections" and then cannot find
 * the QC queue.
 *
 * Pure and React-free, so the filtering can be tested without rendering.
 */

/**
 * The legacy 15-value `Permission` union, mapped to the module that owns it.
 *
 * **Anything genuinely cross-cutting maps to `core`, deliberately.** The bar for
 * scoping a permission to an optional module is that hiding it costs the tenant
 * nothing — and getting that wrong in the other direction is much worse: a
 * permission hidden from the matrix is a permission an owner cannot grant, which
 * silently locks their staff out of a screen they have paid for.
 *
 * `CREATE_ORDER` is the clearest case. It reads like a sales permission and it is
 * the gate on twelve destinations — helpdesk, sites, projects, scheduling,
 * purchase, assets, billing, logistics. Mapping it to `sales` would remove a
 * facility-management tenant's ability to grant access to their own helpdesk.
 * That breadth is a known wart (it is why every service destination was once
 * reachable by anyone who could book an order), and the fix is migrating those
 * destinations to registry keys — not pretending the union is narrower than it is.
 */
const LEGACY_PERMISSION_MODULE: Record<string, ModuleKey> = {
  // Platform-wide administration.
  ACCESS_SETTINGS: "core",
  ACCESS_BRANDING: "core",
  ACCESS_MASTER_DATA: "core",
  MANAGE_TEAM: "core",
  ASSIGN_ROLES: "core",
  TRANSFER_OWNERSHIP: "core",
  VIEW_DASHBOARD: "core",
  VIEW_REPORTS: "core",
  EXPORT_REPORTS: "core",

  // Cross-cutting despite the name. See the note above.
  CREATE_ORDER: "core",

  // Genuinely module-specific: hiding these costs a tenant without the module
  // nothing, because the screens they gate do not exist for them.
  ACCESS_BILLING: "billing",
  DELETE_ORDER: "sales",
  QC_QUEUE: "quality",
  INSPECT_CHECKPOINT: "quality",
};

/** The module that owns a legacy permission. Unknown keys are treated as core. */
export function legacyPermissionModule(permission: string): ModuleKey {
  return LEGACY_PERMISSION_MODULE[permission] ?? "core";
}

/**
 * Whether a legacy permission should be offered to this tenant.
 *
 * `undefined` entitlements means "unknown", and everything shows — the same
 * degradation the nav uses, so a caller that has not been updated does not
 * silently strip an owner's ability to configure their own roles.
 */
export function isLegacyPermissionActive(
  permission: string,
  enabledModules?: ModuleKey[],
): boolean {
  if (!enabledModules) return true;
  const owner = legacyPermissionModule(permission);
  if (alwaysOnModules().includes(owner)) return true;
  return enabledModules.includes(owner);
}

/** Filter a legacy permission list down to what this tenant can use. */
export function scopeLegacyPermissions<T extends string>(
  permissions: T[],
  enabledModules?: ModuleKey[],
): T[] {
  return permissions.filter((p) => isLegacyPermissionActive(p, enabledModules));
}

export interface ScopedPermissionGroup {
  moduleKey: ModuleKey;
  moduleName: string;
  /** The registry permissions this module contributes, grouped as it declares. */
  permissions: (ModulePermission & { moduleKey: ModuleKey })[];
}

/**
 * Registry permissions for the active modules, grouped by module.
 *
 * Ordered as the registry declares them, so `core` leads and the vertical
 * modules trail — which matches how someone reads a role: the general
 * capabilities first, the industry-specific ones last.
 */
export function scopedPermissionGroups(enabledModules?: ModuleKey[]): ScopedPermissionGroup[] {
  return allModules()
    .filter((mod) => {
      if (mod.alwaysOn) return true;
      if (!enabledModules) return true;
      return enabledModules.includes(mod.key);
    })
    .map((mod) => ({
      moduleKey: mod.key,
      moduleName: mod.name,
      permissions: mod.permissions.map((p) => ({ ...p, moduleKey: mod.key })),
    }))
    .filter((group) => group.permissions.length > 0);
}

/** Every registry permission key an active module contributes. */
export function scopedPermissionKeys(enabledModules?: ModuleKey[]): string[] {
  return scopedPermissionGroups(enabledModules).flatMap((g) => g.permissions.map((p) => p.key));
}

/**
 * Grants a role holds that no active module recognises.
 *
 * These are **retained, not stripped** — deactivating Billing for a month and
 * re-enabling it must not silently cost everyone their invoice access. This
 * exists so an operator can *see* them, which is the honest middle ground
 * between hiding the mess and destroying data to tidy it.
 */
export function staleGrants(held: string[], enabledModules?: ModuleKey[]): string[] {
  if (!enabledModules) return [];
  const live = new Set(scopedPermissionKeys(enabledModules));
  const known = new Set(allModules().flatMap((m) => m.permissions.map((p) => p.key)));
  // Only report grants the registry knows about. A key from a deleted module is
  // a different problem and reporting it here would be noise an operator cannot
  // act on.
  return held.filter((key) => known.has(key) && !live.has(key));
}

/** The module that owns a registry permission key, or null if none does. */
export function registryPermissionModule(key: string): ModuleKey | null {
  for (const mod of allModules()) {
    if (mod.permissions.some((p) => p.key === key)) return mod.key;
  }
  return null;
}

/** Whether a registry permission is offered to this tenant. */
export function isRegistryPermissionActive(key: string, enabledModules?: ModuleKey[]): boolean {
  const owner = registryPermissionModule(key);
  if (!owner) return false;
  if (!enabledModules) return true;
  if (getModule(owner)?.alwaysOn) return true;
  return enabledModules.includes(owner);
}
