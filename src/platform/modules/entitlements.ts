import "server-only";

import { cache } from "react";

import prisma from "@/lib/prisma";
import { cached, invalidate } from "@/lib/server/ttl-cache";
import {
  type ModuleKey,
  alwaysOnModules,
  getModule,
  withDependencies,
} from "./registry";

/**
 * Server-side module gating.
 *
 * `Factory.modulesEnabled` used to be a JSON string written at provisioning and
 * never read, so every tenant silently had every feature. These functions are
 * the authoritative answer instead, backed by the ModuleEntitlement table.
 *
 * Gate on the server. A hidden nav item is a UX affordance, not a control —
 * the server action behind it must check too.
 */

/**
 * Memoised per request. A single owner page asks this five or six times — once
 * for the nav, once per `guardModuleAction`, and once per `hasModule()` inside
 * the page's own data loader. Each was a round trip, and against a
 * one-connection pool they queued behind each other.
 */
const ENTITLEMENT_TTL_MS = 60_000;

export const entitledModules = cache(async function entitledModules(
  organizationId: string,
): Promise<ModuleKey[]> {
  return cached(`entitlements:${organizationId}`, ENTITLEMENT_TTL_MS, async () => {
  const rows = await prisma.moduleEntitlement.findMany({
    where: {
      organizationId,
      enabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { moduleKey: true },
  });

  // Unknown keys are ignored rather than trusted: a module removed from the
  // registry must not stay live just because a stale row exists.
  const known = rows
    .map((r) => r.moduleKey as ModuleKey)
    .filter((k) => getModule(k) !== undefined);

  return withDependencies(known);
  });
});

export async function hasModule(
  organizationId: string,
  moduleKey: ModuleKey,
): Promise<boolean> {
  if (alwaysOnModules().includes(moduleKey)) return true;
  return (await entitledModules(organizationId)).includes(moduleKey);
}

/** Throws unless the org is entitled. Use at the top of a server action. */
export async function requireModule(
  organizationId: string,
  moduleKey: ModuleKey,
): Promise<void> {
  if (!(await hasModule(organizationId, moduleKey))) {
    const label = getModule(moduleKey)?.name ?? moduleKey;
    throw new Error(`The ${label} module is not enabled for this organization.`);
  }
}

/**
 * Enable a module (and everything it requires) for an org. Idempotent, so it is
 * safe to call from provisioning and from an admin toggle alike.
 */
export async function enableModules(
  organizationId: string,
  keys: ModuleKey[],
): Promise<void> {
  const resolved = withDependencies(keys);
  invalidate(`entitlements:${organizationId}`);
  await prisma.$transaction(
    resolved.map((moduleKey) =>
      prisma.moduleEntitlement.upsert({
        where: { organizationId_moduleKey: { organizationId, moduleKey } },
        create: { organizationId, moduleKey, enabled: true },
        update: { enabled: true, expiresAt: null },
      }),
    ),
  );
  invalidate(`entitlements:${organizationId}`);
}

/**
 * Disable a module. Always-on modules are refused, and so is disabling
 * something another entitled module still depends on — silently breaking a
 * dependent is worse than refusing.
 */
export async function disableModule(
  organizationId: string,
  moduleKey: ModuleKey,
): Promise<void> {
  if (alwaysOnModules().includes(moduleKey)) {
    throw new Error(`${moduleKey} is always on and cannot be disabled.`);
  }

  const current = await entitledModules(organizationId);
  const dependents = current.filter(
    (k) => k !== moduleKey && (getModule(k)?.requires ?? []).includes(moduleKey),
  );
  if (dependents.length > 0) {
    const names = dependents.map((k) => getModule(k)?.name ?? k).join(", ");
    throw new Error(
      `Cannot disable ${getModule(moduleKey)?.name ?? moduleKey}: ${names} depend${dependents.length === 1 ? "s" : ""} on it.`,
    );
  }

  await prisma.moduleEntitlement.updateMany({
    where: { organizationId, moduleKey },
    data: { enabled: false },
  });
  invalidate(`entitlements:${organizationId}`);
}
