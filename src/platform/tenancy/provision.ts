import "server-only";

import type { Prisma, SystemRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { type ModuleKey, allModules, withDependencies } from "@/platform/modules/registry";

/**
 * Tenant provisioning.
 *
 * Creating a workspace now means creating an Organization, a Factory inside it,
 * the seeded system Roles with their permission grants, and the module
 * entitlements — as one transaction. Before this, three call sites each created
 * a bare Factory with slightly different defaults, and roles/permissions were
 * implicit in code.
 */

/** Default permission grants per archetype. Mirrors the Phase 0 migration. */
const DEFAULT_GRANTS: Record<SystemRole, string[]> = {
  OWNER: [
    "dashboard.view", "settings.access", "branding.access", "billing.access",
    "master_data.access", "team.manage", "team.assign_roles",
    "org.transfer_ownership", "reports.view", "reports.export",
    "product_type.manage", "sales_order.view", "sales_order.create",
    "sales_order.delete", "sales_order.approve", "customer.manage",
    // Service operations. Filtered by entitlement below, so a factory tenant
    // without `sites` never actually receives these.
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

const ROLE_LABELS: Record<SystemRole, string> = {
  OWNER: "Owner",
  CO_OWNER: "Co-Owner",
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  WORKER: "Worker",
  STORE_MANAGER: "Store Manager",
};

/** Modules a new tenant starts with unless told otherwise. */
export const DEFAULT_MODULES: ModuleKey[] = [
  "core", "inventory", "manufacturing", "quality", "procurement", "sales", "hr",
];

/**
 * Industry operating packs.
 *
 * A pack is a named bundle of modules, not a database concept — nothing stores
 * "this tenant is a security company." It exists so onboarding can ask one
 * question a customer can answer ("what kind of business are you?") instead of
 * twenty they cannot ("do you want the assets module?").
 *
 * `withDependencies()` fills in transitive requirements, so a pack lists only
 * what it actually cares about.
 */
export const VERTICAL_PACKS: Record<string, { label: string; modules: ModuleKey[] }> = {
  // --- Service verticals ---------------------------------------------------
  facility_management: {
    label: "Facility Management",
    modules: ["core", "hr", "sites", "scheduling", "helpdesk", "assets", "quality", "procurement", "billing"],
  },
  security_services: {
    label: "Security Services",
    modules: ["core", "hr", "sites", "scheduling", "helpdesk", "billing"],
  },
  staffing_manpower: {
    label: "Staffing & Manpower",
    modules: ["core", "hr", "sites", "scheduling", "crm", "sales", "billing"],
  },
  housekeeping_cleaning: {
    label: "Housekeeping & Cleaning",
    modules: ["core", "hr", "sites", "scheduling", "quality", "helpdesk", "procurement", "billing"],
  },
  maintenance_amc: {
    label: "Maintenance & AMC",
    modules: ["core", "hr", "sites", "helpdesk", "assets", "procurement", "quality", "billing"],
  },
  logistics_fleet: {
    label: "Logistics & Fleet",
    modules: ["core", "hr", "sites", "assets", "sales", "billing"],
  },
  it_services_msp: {
    label: "IT Services / MSP",
    modules: ["core", "hr", "helpdesk", "projects", "crm", "billing"],
  },
  engineering_services: {
    label: "Engineering Services",
    modules: ["core", "hr", "sites", "projects", "assets", "procurement", "quality", "billing"],
  },
  construction: {
    label: "Construction Services",
    modules: ["core", "hr", "sites", "projects", "procurement", "inventory", "quality", "billing"],
  },
  professional_services: {
    label: "Professional Services",
    modules: ["core", "hr", "projects", "crm", "sales", "billing"],
  },
  digital_creative: {
    label: "Digital / Creative Agency",
    modules: ["core", "hr", "projects", "crm", "sales", "billing"],
  },
  events_hospitality: {
    label: "Events & Hospitality",
    modules: ["core", "hr", "sites", "projects", "quality", "procurement", "billing"],
  },

  // --- Production verticals ------------------------------------------------
  auto_components: {
    label: "Auto Components",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales", "automotive"],
  },
  garments_textiles: {
    label: "Garments & Textiles",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  furniture_manufacturing: {
    label: "Furniture Manufacturing",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  engineering_fabrication: {
    label: "Engineering / Fabrication",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales", "assets"],
  },
  packaging: {
    label: "Packaging",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  electronics: {
    label: "Electronics / Electrical",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  food_beverage: {
    label: "Food & Beverage",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  jewellery: {
    label: "Jewellery Manufacturing",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  footwear_leather: {
    label: "Footwear & Leather",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
  printing: {
    label: "Printing & Packaging",
    modules: ["core", "hr", "inventory", "manufacturing", "quality", "procurement", "sales"],
  },
};

export type VerticalPackKey = keyof typeof VERTICAL_PACKS;

/** Pack keys with labels, for a selector. Ordered as declared above. */
export function verticalPackOptions(): { key: string; label: string; modules: ModuleKey[] }[] {
  return Object.entries(VERTICAL_PACKS).map(([key, pack]) => ({
    key,
    label: pack.label,
    modules: withDependencies(pack.modules),
  }));
}

/** The modules a pack resolves to, or the defaults if the key is unknown. */
export function modulesForPack(packKey: string | null | undefined): ModuleKey[] {
  const pack = packKey ? VERTICAL_PACKS[packKey] : undefined;
  return withDependencies(pack?.modules ?? DEFAULT_MODULES);
}

export interface ProvisionInput {
  name: string;
  slug: string;
  logoUrl?: string | null;
  industry?: string | null;
  onboardingStatus?: string;
  setupFee?: number;
  monthlyFee?: number;
  modules?: ModuleKey[];
  currency?: string;
  timezone?: string;
  /** Force specific ids — used by seeds and backfills that need determinism. */
  organizationId?: string;
  factoryId?: string;
}

export interface ProvisionResult {
  organizationId: string;
  factoryId: string;
  /** Seeded system roles, keyed by archetype, for assigning the first users. */
  roleIdByArchetype: Record<SystemRole, string>;
}

/**
 * Create an Organization + Factory + system Roles + entitlements atomically.
 * Accepts an existing transaction client so callers that provision alongside
 * other writes (agreement acceptance, seeding) stay in one transaction.
 */
export async function provisionTenant(
  input: ProvisionInput,
  tx: Prisma.TransactionClient = prisma,
): Promise<ProvisionResult> {
  const requested = input.modules ?? DEFAULT_MODULES;
  const modules = withDependencies(requested);

  // Only grant permissions whose module is actually entitled, so a tenant
  // without `quality` has no role holding quality permissions.
  const entitled = new Set<string>(modules);
  const permissionOwner = new Map<string, string>();
  for (const mod of allModules()) {
    for (const p of mod.permissions) permissionOwner.set(p.key, mod.key);
  }

  const org = await tx.organization.create({
    data: {
      ...(input.organizationId ? { id: input.organizationId } : {}),
      name: input.name,
      slug: input.slug,
      logoUrl: input.logoUrl ?? null,
      ...(input.currency ? { currency: input.currency } : {}),
      ...(input.timezone ? { timezone: input.timezone } : {}),
    },
  });

  const factory = await tx.factory.create({
    data: {
      ...(input.factoryId ? { id: input.factoryId } : {}),
      organizationId: org.id,
      name: input.name,
      slug: input.slug,
      logoUrl: input.logoUrl ?? null,
      industry: input.industry ?? null,
      onboardingStatus: input.onboardingStatus ?? "SETUP",
      setupFee: input.setupFee ?? 0,
      monthlyFee: input.monthlyFee ?? 0,
    },
  });

  await tx.moduleEntitlement.createMany({
    data: modules.map((moduleKey) => ({
      organizationId: org.id,
      moduleKey,
      enabled: true,
    })),
    skipDuplicates: true,
  });

  const archetypes = Object.keys(DEFAULT_GRANTS) as SystemRole[];
  const roleIdByArchetype = {} as Record<SystemRole, string>;

  for (const archetype of archetypes) {
    const grants = DEFAULT_GRANTS[archetype].filter((key) => {
      const owner = permissionOwner.get(key);
      return owner !== undefined && entitled.has(owner);
    });

    const role = await tx.role.create({
      data: {
        organizationId: org.id,
        name: ROLE_LABELS[archetype],
        description: "Built-in role. Rename or copy it; it cannot be deleted.",
        systemRole: archetype,
        isSystem: true,
        permissions: { create: grants.map((key) => ({ key })) },
      },
    });
    roleIdByArchetype[archetype] = role.id;
  }

  return { organizationId: org.id, factoryId: factory.id, roleIdByArchetype };
}

/**
 * The seeded system role for an archetype within an org. Used when creating a
 * user so they land on a real Role rather than a null grant set.
 */
export async function systemRoleId(
  organizationId: string,
  archetype: SystemRole,
  tx: Prisma.TransactionClient = prisma,
): Promise<string | null> {
  const role = await tx.role.findFirst({
    where: { organizationId, systemRole: archetype, isSystem: true },
    select: { id: true },
  });
  return role?.id ?? null;
}
