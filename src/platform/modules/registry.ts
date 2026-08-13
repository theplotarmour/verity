/**
 * The module registry.
 *
 * A module is a unit of product capability a tenant can be entitled to. It
 * declares what it contributes to the platform — permissions, navigation,
 * settings — so that installing or removing it never requires a migration or a
 * code change anywhere else.
 *
 * This replaces `Factory.modulesEnabled`, a JSON string that was written in two
 * places and read in none.
 *
 * Two rules keep this honest:
 *
 *  1. A module may only be depended on by modules that declare it in `requires`.
 *     If `quality` reads a `manufacturing` table without declaring it, the
 *     entitlement check is a lie.
 *  2. `core` is always on and cannot be disabled. Anything a tenant cannot
 *     function without belongs there, not in an optional module.
 */

export type ModuleKey =
  | "core"
  | "inventory"
  | "manufacturing"
  | "quality"
  | "procurement"
  | "sales"
  | "crm"
  | "hr"
  | "finance"
  | "projects"
  | "assets"
  | "helpdesk"
  | "sites"
  | "scheduling"
  | "billing"
  | "automotive"
  | "menu"
  | "tables_orders"
  | "kitchen"
  | "serving"
  | "booking";

export interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  description: string;
  /**
   * Semver. The contract this module offers the rest of the platform.
   *
   * A major bump means a breaking change to its public surface — its exported
   * actions, its nav contract, or the shape of the models it owns. Core promises
   * not to break a module within a major version.
   *
   * Every module starts at 1.0.0 rather than 0.x: they are all shipped and in
   * use by paying tenants, and 0.x would say the opposite.
   *
   * This exists now, before there are external module developers, because
   * adding it afterwards is a migration across everyone else's code and adding
   * it today is a field.
   */
  version: string;
  /** Always-on modules cannot be disabled by entitlement. */
  alwaysOn?: boolean;
  /** Modules that must also be entitled for this one to function. */
  requires: ModuleKey[];
  /**
   * Permission keys this module contributes. These become selectable grants on
   * any Role. Namespaced by convention as `<subject>.<verb>`.
   */
  permissions: ModulePermission[];
  /**
   * Destinations this module contributes to navigation, injected when it is
   * entitled and removed when it is not.
   *
   * These lived in a hardcoded array in `owner-shell.tsx` that *filtered* on
   * `requiredModule` — module-aware, but not module-owned, so adding a module
   * meant editing the shell. A module that has to edit a shared file to be seen
   * is not installable.
   */
  navItems?: ModuleNavItem[];
  dashboardWidgets?: ModuleDashboardWidget[];
  /**
   * True when the module is domain-specific rather than horizontal. Vertical
   * packs are the extension point that keeps industry logic out of core.
   */
  vertical?: boolean;
}

export interface ModuleDashboardWidget {
  key: string;
  title: string;
  /** Registry permission required to see it. */
  requires: string;
  /** Layout hint: "metric" | "panel" | "wide". */
  size: "metric" | "panel" | "wide";
  /** Server component, loaded lazily so a disabled module ships no code. */
  load: () => Promise<{ default: any }>;
  sortOrder?: number;
}

export interface ModulePermission {
  key: string;
  label: string;
  /** Grouping hint for the permission matrix UI. */
  group: string;
}

/**
 * Where a module's destinations appear.
 *
 * `sidebar` is the main nav — dropdown groups on desktop, the dock and its
 * Operations sheet on mobile. `topbar` is the row of config icons: things you
 * set up rather than work in.
 */
export type NavPlacement = "sidebar" | "topbar";

/**
 * A destination a module contributes to navigation.
 *
 * The icon is a **string key**, not a component. This file is imported by server
 * code, scripts and tests, and none of them can hold JSX — the shell maps the
 * key to a Lucide component. It also means a nav item is serialisable, which is
 * what lets the module store render one without importing the module.
 */
export interface ModuleNavItem {
  href: string;
  label: string;
  iconKey: string;
  /** Group heading on desktop. Order is set by the shell, membership by modules. */
  group: string;
  placement?: NavPlacement;
  /** Registry permission key. */
  requires?: string;
  /** Ordering hint within a group. Lower first; ties fall back to declaration order. */
  sortOrder?: number;
}

import { coreModule } from "./definitions/core";
import { inventoryModule } from "./definitions/inventory";
import { manufacturingModule } from "./definitions/manufacturing";
import { qualityModule } from "./definitions/quality";
import { procurementModule } from "./definitions/procurement";
import { salesModule } from "./definitions/sales";
import { crmModule } from "./definitions/crm";
import { hrModule } from "./definitions/hr";
import { financeModule } from "./definitions/finance";
import { projectsModule } from "./definitions/projects";
import { assetsModule } from "./definitions/assets";
import { helpdeskModule } from "./definitions/helpdesk";
import { sitesModule } from "./definitions/sites";
import { schedulingModule } from "./definitions/scheduling";
import { billingModule } from "./definitions/billing";
import { automotiveModule } from "./definitions/automotive";
import { menuModule } from "./definitions/menu";
import { tables_ordersModule } from "./definitions/tables_orders";
import { kitchenModule } from "./definitions/kitchen";
import { servingModule } from "./definitions/serving";
import { bookingModule } from "./definitions/booking";

const MODULES: ModuleDefinition[] = [
  coreModule,
  inventoryModule,
  manufacturingModule,
  qualityModule,
  procurementModule,
  salesModule,
  crmModule,
  hrModule,
  financeModule,
  projectsModule,
  assetsModule,
  helpdeskModule,
  sitesModule,
  schedulingModule,
  billingModule,
  automotiveModule,
  menuModule,
  tables_ordersModule,
  kitchenModule,
  servingModule,
  bookingModule,
];

const BY_KEY = new Map<ModuleKey, ModuleDefinition>(MODULES.map((m) => [m.key, m]));

export function allModules(): ModuleDefinition[] {
  return MODULES;
}

export function getModule(key: ModuleKey): ModuleDefinition | undefined {
  return BY_KEY.get(key);
}

export function alwaysOnModules(): ModuleKey[] {
  return MODULES.filter((m) => m.alwaysOn).map((m) => m.key);
}

/** Every permission key any module can contribute, deduplicated. */
export function allPermissions(): ModulePermission[] {
  const seen = new Map<string, ModulePermission>();
  for (const mod of MODULES) {
    for (const p of mod.permissions) if (!seen.has(p.key)) seen.set(p.key, p);
  }
  return [...seen.values()];
}

/** Which module contributes a given permission key. */
export function moduleForPermission(key: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.permissions.some((p) => p.key === key));
}

/**
 * Expand a set of entitled modules to include everything they require.
 * Entitling `manufacturing` without `inventory` is a configuration error, not
 * a runtime one — resolve it here rather than failing deep in a query.
 */
export function withDependencies(keys: ModuleKey[]): ModuleKey[] {
  const out = new Set<ModuleKey>(alwaysOnModules());
  const visit = (k: ModuleKey) => {
    if (out.has(k)) return;
    out.add(k);
    getModule(k)?.requires.forEach(visit);
  };
  keys.forEach(visit);
  return [...out];
}
