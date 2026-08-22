import type { Prisma, SystemRole } from "@prisma/client";

import { allModules, withDependencies, type ModuleKey } from "@/platform/modules/registry";
import { DEFAULT_GRANTS } from "./default-grants";

/**
 * The provisioning transaction, with no `server-only` and no imported client.
 *
 * `provision.ts` is server-only, which is right for the app and useless for the
 * setup scripts that also need to create a workspace. Rather than let a third
 * copy of "create org, factory, entitlements, roles" drift out of sync with the
 * first two, the logic lives here and both call it with their own client.
 */

export const ROLE_LABELS: Record<SystemRole, string> = {
  OWNER: "Owner",
  CO_OWNER: "Co-Owner",
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  WORKER: "Worker",
  STORE_MANAGER: "Store Manager",
};

export interface ProvisionCoreInput {
  name: string;
  slug: string;
  logoUrl?: string | null;
  industry?: string | null;
  onboardingStatus?: string;
  setupFee?: number;
  monthlyFee?: number;
  modules: ModuleKey[];
  currency?: string;
  timezone?: string;
  organizationId?: string;
  factoryId?: string;
}

export interface ProvisionCoreResult {
  organizationId: string;
  factoryId: string;
  roleIdByArchetype: Record<SystemRole, string>;
  modules: ModuleKey[];
}

export async function provisionCore(
  tx: Prisma.TransactionClient,
  input: ProvisionCoreInput,
): Promise<ProvisionCoreResult> {
  const modules = withDependencies(input.modules);

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

  const roleIdByArchetype = {} as Record<SystemRole, string>;
  for (const archetype of Object.keys(DEFAULT_GRANTS) as SystemRole[]) {
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

  return { organizationId: org.id, factoryId: factory.id, roleIdByArchetype, modules };
}
