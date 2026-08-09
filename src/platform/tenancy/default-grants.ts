import type { SystemRole } from "@prisma/client";

/**
 * Default permission grants per role archetype.
 *
 * Lives apart from `provision.ts` because that module is `server-only`, and
 * this table has a second consumer that runs outside Next: the backfill script
 * that tops up system roles created before a module existed. Pure data with no
 * runtime imports, so both can read it.
 *
 * Grants are filtered by entitlement wherever they are applied — a tenant
 * without `quality` never ends up with a role holding quality permissions.
 */
export const DEFAULT_GRANTS: Record<SystemRole, string[]> = {
  OWNER: [
    "dashboard.view", "settings.access", "branding.access", "billing.access",
    "master_data.access", "team.manage", "team.assign_roles",
    "org.transfer_ownership", "reports.view", "reports.export",
    "product_type.manage", "sales_order.view", "sales_order.create",
    "sales_order.delete", "sales_order.approve", "customer.manage",
    // Service operations.
    "ticket.view", "ticket.manage", "service_wo.view", "service_wo.manage",
    "site.view", "site.manage", "site.deploy",
    "project.view", "project.manage", "timesheet.record", "timesheet.approve",
    "asset.view", "asset.manage", "asset.maintain",
    "schedule.view", "schedule.manage", "schedule.swap",
    "invoice.view", "invoice.manage", "payroll.view", "payroll.export",
  ],
  CO_OWNER: [
    "dashboard.view", "settings.access", "branding.access", "master_data.access",
    "team.manage", "team.assign_roles", "reports.view", "reports.export",
    "product_type.manage", "sales_order.view", "sales_order.create",
    "sales_order.delete", "sales_order.approve", "customer.manage",
    "ticket.view", "ticket.manage", "service_wo.view", "service_wo.manage",
    "site.view", "site.manage", "site.deploy",
    "project.view", "project.manage", "timesheet.record", "timesheet.approve",
    "asset.view", "asset.manage", "asset.maintain",
    "schedule.view", "schedule.manage", "schedule.swap",
    "invoice.view", "invoice.manage", "payroll.view", "payroll.export",
  ],
  MANAGER: [
    "dashboard.view", "master_data.access", "team.manage", "reports.view",
    "reports.export", "sales_order.view", "sales_order.create", "customer.manage",
    "ticket.view", "ticket.manage", "service_wo.view", "service_wo.manage",
    "site.view", "site.manage", "site.deploy",
    "project.view", "project.manage", "timesheet.record", "timesheet.approve",
    "asset.view", "asset.manage", "asset.maintain",
    "schedule.view", "schedule.manage", "schedule.swap",
    "invoice.view", "invoice.manage", "payroll.view", "payroll.export",
  ],
  SUPERVISOR: [
    "dashboard.view", "reports.view", "quality.queue", "quality.inspect",
    "production.supervise",
    // A supervisor runs a site day to day: they post staff and work the queue,
    // but do not sign contracts or raise invoices.
    "site.view", "site.deploy",
    "ticket.view", "ticket.manage", "service_wo.view", "service_wo.manage",
    "project.view", "timesheet.record",
    "asset.view", "asset.maintain",
    "schedule.view", "schedule.manage",
  ],
  WORKER: ["production.jobs", "timesheet.record", "schedule.view", "schedule.swap"],
  STORE_MANAGER: ["dashboard.view", "sales_order.view", "sales_order.create"],
};
