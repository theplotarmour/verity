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
  ],
  CO_OWNER: [
    "dashboard.view", "settings.access", "branding.access", "master_data.access",
    "team.manage", "team.assign_roles", "reports.view", "reports.export",
    "product_type.manage", "sales_order.view", "sales_order.create",
    "sales_order.delete", "sales_order.approve", "customer.manage",
  ],
  MANAGER: [
    "dashboard.view", "master_data.access", "team.manage", "reports.view",
    "reports.export", "sales_order.view", "sales_order.create", "customer.manage",
  ],
  SUPERVISOR: [
    "dashboard.view", "reports.view", "quality.queue", "quality.inspect",
    "production.supervise",
  ],
  WORKER: ["production.jobs"],
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
