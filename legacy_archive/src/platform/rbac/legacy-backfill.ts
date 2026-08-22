import type { SystemRole } from "@prisma/client";

/**
 * Phase 4 backfill: legacy role permissions expressed as registry grants.
 *
 * **Nothing here runs on its own.** This module is the reviewable matrix; the
 * script that applies it lives in `scripts/backfill-role-permissions.ts` and is
 * run by hand.
 *
 * ## Why a backfill is needed at all
 *
 * `resolveNavItems` currently has three gates, and the third is the legacy
 * `can(item.permission)` union. Deleting it means every nav item must gate on a
 * registry permission instead — and today **no role in any organisation holds**
 * `stock.view`, `item.view`, `work_order.create`, `production.supervise`,
 * `quality.queue`, `purchase_order.create` or `dispatch.record`. Those pages are
 * reachable purely because the legacy union says `CREATE_ORDER` or `QC_QUEUE`.
 *
 * Remove gate 3 without this backfill and every owner, in every tenant, silently
 * loses Inventory, Production, Floor, QC Floor, Purchase and Logistics.
 *
 * ## Why the obvious mapping is wrong
 *
 * `CREATE_ORDER` is not one permission. It gates twelve destinations, which is
 * the lie Phase 4 exists to remove — so there is no mechanical equivalence to
 * migrate. Expanding it uniformly would hand `STORE_MANAGER` procurement and
 * dispatch permissions it has never had: `STORE_MANAGER_ALLOWED` confines that
 * role to order-taking, dashboard and inventory, but that carve-out is a *nav*
 * restriction, not a permission one. A blanket expansion turns a hidden link into
 * a real capability against every action guarded on it.
 *
 * So the matrix below is written per role, deliberately, rather than derived.
 *
 * ## Rules this matrix follows
 *
 * - Role-driven, never org-driven. `SystemRole` values are schema constants; the
 *   script iterates whatever organisations exist and applies the same matrix to
 *   each. No org ids, no per-tenant branches, no knowledge of tenant content.
 * - Additive only, via `createMany({ skipDuplicates: true })`. Re-running changes
 *   nothing and removes nothing — a tenant may have granted extra permissions to a
 *   built-in role by hand, and a migration has no business deleting those.
 * - Entitlement still filters. `resolveAccess` drops any permission whose module
 *   the organisation is not entitled to, so granting `stock.view` to a restaurant's
 *   owner is inert until they buy `inventory`.
 */

/** A permission a role should hold once the legacy union is gone. */
export type RegistryKey = string;

/**
 * The grants each system role needs so that removing gate 3 changes nothing a
 * user can currently reach.
 *
 * Read this as: "what does this role see and do today, expressed in the new
 * vocabulary" — not "what would we grant if we were designing from scratch".
 * Widening beyond current reach is a product decision, not a migration.
 */
export const ROLE_REGISTRY_GRANTS: Record<SystemRole, RegistryKey[]> = {
  /*
   * Owner and co-owner have identical legacy defaults — all fifteen — so they get
   * the same registry set. That equality is in `DEFAULT_ROLE_PERMISSIONS` today;
   * it is not a judgement introduced here.
   */
  OWNER: [
    "dashboard.view", "settings.access", "branding.access", "billing.access",
    "master_data.access", "team.manage", "team.assign_roles",
    "org.transfer_ownership", "reports.view", "reports.export",
    "product_type.manage",
    // sales
    "sales_order.view", "sales_order.create", "sales_order.delete",
    "sales_order.approve", "customer.manage", "dispatch.record",
    // inventory
    "item.view", "item.manage", "stock.view", "stock.adjust", "warehouse.manage",
    // manufacturing
    "bom.view", "bom.manage", "work_order.create", "work_order.release",
    "production.jobs", "production.supervise",
    // quality
    "quality.queue", "quality.inspect", "quality.approve",
    // procurement
    "supplier.manage", "purchase_order.create", "purchase_order.approve",
    "purchase_receipt.record",
  ],

  CO_OWNER: [
    "dashboard.view", "settings.access", "branding.access", "billing.access",
    "master_data.access", "team.manage", "team.assign_roles",
    "org.transfer_ownership", "reports.view", "reports.export",
    "sales_order.view", "sales_order.create", "sales_order.delete",
    "customer.manage", "dispatch.record",
    "item.view", "stock.view", "stock.adjust",
    "bom.view", "work_order.create", "work_order.release",
    "production.jobs", "production.supervise",
    "quality.queue", "quality.inspect",
    "purchase_order.create", "purchase_receipt.record",
  ],

  /*
   * Manager holds CREATE_ORDER and QC_QUEUE today, so it reaches production,
   * inventory, purchase, logistics and the QC floor. It does not hold
   * ACCESS_SETTINGS or ACCESS_BILLING, so those stay out.
   */
  MANAGER: [
    "dashboard.view", "master_data.access", "team.manage", "team.assign_roles",
    "reports.view",
    "sales_order.view", "sales_order.create", "customer.manage", "dispatch.record",
    "item.view", "stock.view",
    "bom.view", "work_order.create", "work_order.release", "production.supervise",
    "quality.queue",
    "purchase_order.create", "purchase_receipt.record",
  ],

  /*
   * A supervisor runs a department, and when that department is QC this is the
   * role that inspects. Deliberately nothing in sales or procurement: its legacy
   * set is QC_QUEUE, INSPECT_CHECKPOINT, VIEW_DASHBOARD, MANAGE_TEAM and
   * WORKER_JOBS, none of which reaches a purchase order or a dispatch.
   */
  SUPERVISOR: [
    "dashboard.view", "reports.view",
    "quality.queue", "quality.inspect",
    "production.jobs", "production.supervise",
  ],

  /** Works assigned job cards. Nothing else. */
  WORKER: ["production.jobs"],

  /*
   * Books customer orders, and that is the whole job. Scoped to match
   * STORE_MANAGER_ALLOWED — order-taking, dashboard, inventory — because a
   * blanket CREATE_ORDER expansion would grant purchase and dispatch rights the
   * nav carve-out has always hidden. `stock.view` and `item.view` are read-only:
   * they need to see what is on the shelf to book against it.
   */
  STORE_MANAGER: [
    "dashboard.view",
    "sales_order.view", "sales_order.create", "customer.manage",
    "item.view", "stock.view",
  ],
};

/**
 * Grants that were considered and deliberately withheld, with the reason.
 *
 * Kept in code rather than in a commit message: the next person to widen a role
 * should see why it is narrow before they widen it.
 */
export const WITHHELD: Array<{ role: SystemRole; key: RegistryKey; why: string }> = [
  {
    role: "SUPERVISOR",
    key: "team.manage",
    why: "Supervisor holds MANAGE_TEAM today, but team.manage is a blanket over-grant. Lacks department-scoped equivalent, so we withhold it.",
  },
  {
    role: "STORE_MANAGER",
    key: "purchase_order.create",
    why: "CREATE_ORDER gates purchasing today, but STORE_MANAGER_ALLOWED hides the page. Granting it would turn a hidden link into a real capability.",
  },
  {
    role: "STORE_MANAGER",
    key: "dispatch.record",
    why: "Same as purchasing — reachable only through a nav carve-out that has always excluded this role.",
  },
  {
    role: "STORE_MANAGER",
    key: "work_order.create",
    why: "releaseDrafts already gates releasing to production on manager/owner. Granting this would contradict a rule the code enforces elsewhere.",
  },
  {
    role: "SUPERVISOR",
    key: "sales_order.create",
    why: "A supervisor's legacy set has no CREATE_ORDER. Adding it here would widen the role during a migration that is meant to preserve reach.",
  },
  {
    role: "MANAGER",
    key: "settings.access",
    why: "Not in the legacy manager default. Migration preserves reach; it does not promote.",
  },
  {
    role: "WORKER",
    key: "dashboard.view",
    why: "WORKER_JOBS is the whole legacy set. Workers land on /worker, not the owner dashboard.",
  },
];

/**
 * Ambiguous calls a reviewer should look at, rather than defaults to trust.
 *
 * These are the places where "what does this role reach today" has more than one
 * defensible answer, because the legacy permission was doing two jobs at once.
 */
export const AMBIGUOUS: Array<{ role: SystemRole; keys: RegistryKey[]; question: string }> = [
  {
    role: "MANAGER",
    keys: ["purchase_order.create", "purchase_receipt.record"],
    question:
      "Manager holds CREATE_ORDER, which today shows /owner/purchase. Should a manager be able to raise purchase orders, or only view them? There is no purchase_order.view in the registry, so 'view only' is not currently expressible.",
  },
  {
    role: "CO_OWNER",
    keys: ["work_order.release"],
    question:
      "Co-owner has the same legacy set as owner, so this follows. Confirm co-owner really is owner-equivalent rather than that being an old oversight in DEFAULT_ROLE_PERMISSIONS.",
  },
  {
    role: "SUPERVISOR",
    keys: ["team.manage"],
    question:
      "Supervisor holds MANAGE_TEAM today, which shows /owner/team and /owner/departments. Is that intended, or was MANAGE_TEAM being used to mean 'manage my department's roster'?",
  },
];
