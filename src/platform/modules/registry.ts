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
  | "serving";

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
  /**
   * True when the module is domain-specific rather than horizontal. Vertical
   * packs are the extension point that keeps industry logic out of core.
   */
  vertical?: boolean;
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
  /**
   * Deprecated 15-value union, still the gate for production destinations.
   * See the note on `requires`.
   */
  permission: string;
  /** Registry permission key. Preferred; `permission` is the migration path. */
  requires?: string;
  /** Ordering hint within a group. Lower first; ties fall back to declaration order. */
  sortOrder?: number;
}

const MODULES: ModuleDefinition[] = [
  {
    key: "core",
    version: "1.0.0",
    name: "Core",
    description:
      "Identity, roles, org settings, audit, notifications, files and the activity timeline.",
    alwaysOn: true,
    requires: [],
    permissions: [
      { key: "dashboard.view", label: "View dashboard", group: "General" },
      { key: "settings.access", label: "Access settings", group: "Administration" },
      { key: "branding.access", label: "Manage branding", group: "Administration" },
      { key: "billing.access", label: "Access billing", group: "Administration" },
      { key: "master_data.access", label: "Manage master data", group: "Administration" },
      { key: "team.manage", label: "Manage team", group: "People" },
      { key: "team.assign_roles", label: "Assign roles", group: "People" },
      { key: "org.transfer_ownership", label: "Transfer ownership", group: "Administration" },
      { key: "reports.view", label: "View reports", group: "Reporting" },
      { key: "reports.export", label: "Export reports", group: "Reporting" },
      { key: "product_type.manage", label: "Define product types", group: "Administration" },
    ],
    navItems: [
      { href: "/owner/dashboard", label: "Dashboard", iconKey: "home", group: "Overview", permission: "VIEW_DASHBOARD" },
      { href: "/owner/reports", label: "Reports", iconKey: "chart", group: "Finance", permission: "VIEW_REPORTS", sortOrder: 20 },
      { href: "/owner/master-data", label: "Master Data", iconKey: "database", group: "Configure", placement: "topbar", permission: "ACCESS_MASTER_DATA" },
      { href: "/owner/customers", label: "Customers", iconKey: "building", group: "Configure", placement: "topbar", permission: "CREATE_ORDER" },
      { href: "/owner/team", label: "Team", iconKey: "users", group: "Configure", placement: "topbar", permission: "MANAGE_TEAM" },
      { href: "/owner/departments", label: "Departments", iconKey: "factory", group: "Configure", placement: "topbar", permission: "MANAGE_TEAM" },
      { href: "/owner/settings", label: "Settings", iconKey: "settings", group: "Configure", placement: "topbar", permission: "ACCESS_SETTINGS" },
    ],
  },
  {
    key: "inventory",
    version: "1.0.0",
    name: "Inventory",
    description: "Items, warehouses, bins, stock ledger, reservations and valuation.",
    requires: ["core"],
    permissions: [
      { key: "item.view", label: "View items", group: "Inventory" },
      { key: "item.manage", label: "Manage items", group: "Inventory" },
      { key: "stock.view", label: "View stock", group: "Inventory" },
      { key: "stock.adjust", label: "Adjust stock", group: "Inventory" },
      { key: "stock.transfer", label: "Transfer stock", group: "Inventory" },
      { key: "warehouse.manage", label: "Manage warehouses", group: "Inventory" },
    ],
    navItems: [
      { href: "/owner/inventory", label: "Inventory", iconKey: "package", group: "Shared Operations", permission: "CREATE_ORDER" },
    ],
  },
  {
    key: "manufacturing",
    version: "1.0.0",
    name: "Manufacturing",
    description: "BOMs, blueprints, routing, work orders, job cards and shop-floor capture.",
    requires: ["core", "inventory"],
    permissions: [
      { key: "bom.view", label: "View BOMs", group: "Manufacturing" },
      { key: "bom.manage", label: "Manage BOMs", group: "Manufacturing" },
      { key: "work_order.create", label: "Create work orders", group: "Manufacturing" },
      { key: "work_order.release", label: "Release to floor", group: "Manufacturing" },
      { key: "production.jobs", label: "Work assigned jobs", group: "Shop floor" },
      { key: "production.supervise", label: "Supervise a department", group: "Shop floor" },
    ],
    navItems: [
      { href: "/owner/production", label: "Production", iconKey: "wrench", group: "Production", permission: "CREATE_ORDER", sortOrder: 2 },
      { href: "/owner/floor", label: "Floor", iconKey: "flask", group: "Production", permission: "QC_QUEUE", sortOrder: 3 },
    ],
  },
  {
    key: "quality",
    version: "1.0.0",
    name: "Quality",
    description: "Templates, checkpoints, inspections, rework and public verification passports.",
    requires: ["core"],
    permissions: [
      { key: "quality.queue", label: "View QC queue", group: "Quality" },
      { key: "quality.inspect", label: "Perform inspections", group: "Quality" },
      { key: "quality.approve", label: "Approve or reject", group: "Quality" },
      { key: "quality.template_manage", label: "Manage QC templates", group: "Quality" },
      { key: "quality.passport_publish", label: "Publish public passports", group: "Quality" },
    ],
    navItems: [
      { href: "/owner/qc-floor", label: "Quality", iconKey: "check", group: "Shared Operations", permission: "QC_QUEUE", sortOrder: 4 },
    ],
  },
  {
    key: "procurement",
    version: "1.0.0",
    name: "Procurement",
    description: "Suppliers, purchase requests, orders, receipts and invoices.",
    requires: ["core", "inventory"],
    permissions: [
      { key: "supplier.manage", label: "Manage suppliers", group: "Procurement" },
      { key: "purchase_request.create", label: "Raise purchase requests", group: "Procurement" },
      { key: "purchase_order.create", label: "Create purchase orders", group: "Procurement" },
      { key: "purchase_order.approve", label: "Approve purchase orders", group: "Procurement" },
      { key: "purchase_receipt.record", label: "Record receipts", group: "Procurement" },
    ],
    navItems: [
      { href: "/owner/purchase", label: "Purchase", iconKey: "cart", group: "Shared Operations", permission: "CREATE_ORDER", sortOrder: 2 },
    ],
  },
  {
    key: "sales",
    version: "1.0.0",
    name: "Sales",
    description: "Customers, sales orders, dispatch and delivery.",
    requires: ["core"],
    permissions: [
      { key: "sales_order.view", label: "View orders", group: "Sales" },
      { key: "sales_order.create", label: "Create orders", group: "Sales" },
      { key: "sales_order.delete", label: "Delete orders", group: "Sales" },
      { key: "sales_order.approve", label: "Approve orders", group: "Sales" },
      { key: "dispatch.record", label: "Record dispatch", group: "Sales" },
      { key: "customer.manage", label: "Manage customers", group: "Sales" },
    ],
    navItems: [
      { href: "/owner/order-taking", label: "Order Taking", iconKey: "clipboard", group: "Production", permission: "CREATE_ORDER" },
      { href: "/owner/logistics", label: "Logistics", iconKey: "truck", group: "Production", permission: "CREATE_ORDER", sortOrder: 4 },
    ],
  },
  {
    key: "crm",
    version: "1.0.0",
    name: "CRM",
    description: "Leads, deals, pipeline and customer activity history.",
    requires: ["core", "sales"],
    permissions: [
      { key: "deal.view", label: "View pipeline", group: "CRM" },
      { key: "deal.manage", label: "Manage deals", group: "CRM" },
      { key: "deal.close", label: "Close or lose deals", group: "CRM" },
    ],
  },
  {
    key: "hr",
    version: "1.0.0",
    name: "People",
    description: "Employee profiles, shifts, attendance and leave.",
    requires: ["core"],
    permissions: [
      { key: "employee.view", label: "View employee records", group: "People" },
      { key: "employee.manage", label: "Manage employee records", group: "People" },
      { key: "attendance.record", label: "Record attendance", group: "People" },
      { key: "leave.approve", label: "Approve leave", group: "People" },
    ],
  },
  {
    key: "finance",
    version: "1.0.0",
    name: "Finance",
    description: "Chart of accounts, journals, fiscal periods, costing and margin.",
    requires: ["core"],
    permissions: [
      { key: "account.manage", label: "Manage chart of accounts", group: "Finance" },
      { key: "journal.post", label: "Post journal entries", group: "Finance" },
      { key: "journal.view", label: "View ledger", group: "Finance" },
      { key: "period.close", label: "Close fiscal periods", group: "Finance" },
    ],
  },
  {
    key: "projects",
    version: "1.0.0",
    name: "Projects",
    description:
      "Engagements, tasks and timesheets. The service-sector counterpart to work orders.",
    requires: ["core"],
    permissions: [
      { key: "project.view", label: "View projects", group: "Projects" },
      { key: "project.manage", label: "Manage projects", group: "Projects" },
      { key: "timesheet.record", label: "Record time", group: "Projects" },
      { key: "timesheet.approve", label: "Approve timesheets", group: "Projects" },
    ],
    navItems: [
      { href: "/owner/projects", label: "Projects", iconKey: "folder", group: "Service Operations", permission: "CREATE_ORDER", requires: "project.view", sortOrder: 3 },
    ],
  },
  {
    key: "assets",
    version: "1.0.0",
    name: "Assets",
    description: "Asset register, assignment, maintenance schedules and depreciation.",
    requires: ["core"],
    permissions: [
      { key: "asset.view", label: "View assets", group: "Assets" },
      { key: "asset.manage", label: "Manage assets", group: "Assets" },
      { key: "asset.maintain", label: "Record maintenance", group: "Assets" },
    ],
    navItems: [
      { href: "/owner/assets", label: "Assets", iconKey: "hardhat", group: "Shared Operations", permission: "CREATE_ORDER", requires: "asset.view", sortOrder: 3 },
    ],
  },
  {
    key: "helpdesk",
    version: "1.0.0",
    name: "Helpdesk",
    description:
      "Tickets, SLAs and support queues, plus the service work orders dispatched from them.",
    requires: ["core"],
    permissions: [
      { key: "ticket.view", label: "View tickets", group: "Helpdesk" },
      { key: "ticket.manage", label: "Manage tickets", group: "Helpdesk" },
      { key: "service_wo.view", label: "View service work orders", group: "Helpdesk" },
      { key: "service_wo.manage", label: "Manage service work orders", group: "Helpdesk" },
    ],
    navItems: [
      { href: "/owner/helpdesk", label: "Helpdesk", iconKey: "lifebuoy", group: "Service Operations", permission: "CREATE_ORDER", requires: "ticket.view" },
      { href: "/owner/service-work-orders", label: "Work Orders", iconKey: "hammer", group: "Service Operations", permission: "CREATE_ORDER", requires: "service_wo.view", sortOrder: 2 },
    ],
  },
  {
    key: "sites",
    version: "1.0.0",
    name: "Sites & Locations",
    description:
      "Client sites, workforce deployment and site-level SLAs. Essential for service businesses.",
    requires: ["core"],
    permissions: [
      { key: "site.view", label: "View sites", group: "Sites" },
      { key: "site.manage", label: "Manage sites", group: "Sites" },
      { key: "site.deploy", label: "Deploy staff to sites", group: "Sites" },
    ],
    navItems: [
      { href: "/owner/sites", label: "Sites", iconKey: "pin", group: "Service Operations", permission: "CREATE_ORDER", requires: "site.view", sortOrder: 4 },
    ],
  },
  {
    key: "scheduling",
    version: "1.0.0",
    name: "Shift Scheduling",
    description: "Calendar-based shift assignment per user and site, with swap requests.",
    requires: ["core", "hr"],
    permissions: [
      { key: "schedule.view", label: "View schedules", group: "Scheduling" },
      { key: "schedule.manage", label: "Publish schedules", group: "Scheduling" },
      { key: "schedule.swap", label: "Request shift swaps", group: "Scheduling" },
    ],
    navItems: [
      { href: "/owner/scheduling", label: "Scheduling", iconKey: "calendar", group: "Service Operations", permission: "CREATE_ORDER", requires: "schedule.view", sortOrder: 5 },
    ],
  },
  {
    key: "billing",
    version: "1.0.0",
    name: "Billing & Payroll",
    description:
      "Service invoices to clients, and payroll input summaries from attendance and timesheets.",
    requires: ["core", "sales"],
    permissions: [
      { key: "invoice.view", label: "View invoices", group: "Billing" },
      { key: "invoice.manage", label: "Create and send invoices", group: "Billing" },
      { key: "payroll.view", label: "View payroll inputs", group: "Billing" },
      { key: "payroll.export", label: "Export payroll", group: "Billing" },
    ],
    navItems: [
      { href: "/owner/billing", label: "Billing", iconKey: "receipt", group: "Finance", permission: "CREATE_ORDER", requires: "invoice.view" },
    ],
  },
  {
    key: "automotive",
    version: "1.0.0",
    name: "Automotive",
    description:
      "Vehicle catalogue (brand, model, generation, year, variant) and product fitment. " +
      "The first vertical pack — proves that industry specifics live outside core.",
    requires: ["core", "sales"],
    vertical: true,
    permissions: [
      { key: "vehicle_catalog.view", label: "View vehicle catalogue", group: "Automotive" },
      { key: "vehicle_catalog.manage", label: "Manage vehicle catalogue", group: "Automotive" },
      { key: "fitment.manage", label: "Manage product fitment", group: "Automotive" },
    ],
  },

  /*
   * Restaurant OS — single-location restaurants.
   *
   * Four modules rather than one, because they are genuinely separable and a
   * restaurant buys them in that order: the menu is worth having on its own (a
   * priced, photographed, in-stock card), table orders need a menu to order from,
   * and the kitchen and pass both need orders to work on. Someone running a
   * takeaway counter wants menu and orders and no table service at all.
   *
   * Not marked `vertical`, which is a pricing decision as much as a taxonomic
   * one: `pricingTier` reads that flag as Tier 3 (₹7,000), and these are Tier 2
   * operations modules (₹4,500). A restaurant's menu is no more industry-exotic
   * than a factory's BOM.
   *
   * Permissions land with each module's screens. An empty list here means "not
   * yet", and the permission matrix simply shows nothing for them — better than
   * inventing keys now and having to rename them once the screens exist.
   */
  {
    key: "menu",
    version: "1.0.0",
    name: "Menu",
    description:
      "Menu categories and items — price, veg marker, photo, and the availability toggle " +
      "a manager hits when something runs out mid-service.",
    requires: ["core"],
    permissions: [],
  },
  {
    key: "tables_orders",
    version: "1.0.0",
    name: "Tables & Orders",
    description:
      "Floor plan, table state, and the running order (KOT) attached to each — the spine " +
      "the kitchen and the pass both read from.",
    requires: ["core", "menu"],
    permissions: [],
  },
  {
    key: "kitchen",
    version: "1.0.0",
    name: "Kitchen",
    description:
      "The kitchen display: tickets by station, fire and bump, and per-item timing so a " +
      "table's courses land together.",
    requires: ["core", "tables_orders"],
    permissions: [],
  },
  {
    key: "serving",
    version: "1.0.0",
    name: "Serving",
    description:
      "The pass and the floor: what is ready to run, what has been delivered, and which " +
      "table is waiting on what.",
    requires: ["core", "tables_orders"],
    permissions: [],
  },
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
