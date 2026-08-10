import "server-only";

import type { Prisma, SystemRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { type ModuleKey, withDependencies } from "@/platform/modules/registry";
import { provisionCore } from "./provision-core";
import { DEFAULT_MODULES } from "./packs";

/**
 * Tenant provisioning.
 *
 * Creating a workspace now means creating an Organization, a Factory inside it,
 * the seeded system Roles with their permission grants, and the module
 * entitlements — as one transaction. Before this, three call sites each created
 * a bare Factory with slightly different defaults, and roles/permissions were
 * implicit in code.
 */

const ROLE_LABELS: Record<SystemRole, string> = {
  OWNER: "Owner",
  CO_OWNER: "Co-Owner",
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  WORKER: "Worker",
  STORE_MANAGER: "Store Manager",
};

/**
 * Pack data lives in `./packs`, which has no `server-only` import so scripts
 * and tests can read it. Re-exported here because every existing caller reaches
 * for it through this module.
 */
export {
  DEFAULT_MODULES,
  VERTICAL_PACKS,
  type VerticalPackKey,
  resolvePackKey,
  packLabel,
  verticalPackOptions,
  modulesForPack,
} from "./packs";

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
  const { organizationId, factoryId, roleIdByArchetype } = await provisionCore(tx, {
    ...input,
    modules: input.modules ?? DEFAULT_MODULES,
  });
  return { organizationId, factoryId, roleIdByArchetype };
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
