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
  | "automotive";

export interface ModuleDefinition {
  key: ModuleKey;
  name: string;
  description: string;
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

const MODULES: ModuleDefinition[] = [
  {
    key: "core",
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
  },
  {
    key: "inventory",
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
  },
  {
    key: "manufacturing",
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
  },
  {
    key: "quality",
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
  },
  {
    key: "procurement",
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
  },
  {
    key: "sales",
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
  },
  {
    key: "crm",
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
  },
  {
    key: "assets",
    name: "Assets",
    description: "Asset register, assignment, maintenance schedules and depreciation.",
    requires: ["core"],
    permissions: [
      { key: "asset.view", label: "View assets", group: "Assets" },
      { key: "asset.manage", label: "Manage assets", group: "Assets" },
      { key: "asset.maintain", label: "Record maintenance", group: "Assets" },
    ],
  },
  {
    key: "helpdesk",
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
  },
  {
    key: "sites",
    name: "Sites & Locations",
    description:
      "Client sites, workforce deployment and site-level SLAs. Essential for service businesses.",
    requires: ["core"],
    permissions: [
      { key: "site.view", label: "View sites", group: "Sites" },
      { key: "site.manage", label: "Manage sites", group: "Sites" },
      { key: "site.deploy", label: "Deploy staff to sites", group: "Sites" },
    ],
  },
  {
    key: "scheduling",
    name: "Shift Scheduling",
    description: "Calendar-based shift assignment per user and site, with swap requests.",
    requires: ["core", "hr"],
    permissions: [
      { key: "schedule.view", label: "View schedules", group: "Scheduling" },
      { key: "schedule.manage", label: "Publish schedules", group: "Scheduling" },
      { key: "schedule.swap", label: "Request shift swaps", group: "Scheduling" },
    ],
  },
  {
    key: "billing",
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
  },
  {
    key: "automotive",
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
