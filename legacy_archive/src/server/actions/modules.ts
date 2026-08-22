"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireHqAction } from "@/lib/server/hq-auth";
import {
  allModules,
  alwaysOnModules,
  getModule,
  withDependencies,
  type ModuleKey,
} from "@/platform/modules/registry";
import { entitledModules } from "@/platform/modules/entitlements";
import { invalidate } from "@/lib/server/ttl-cache";
import { syncSubscriptionLines } from "@/platform/billing/invoices";
import { modulePrice, formatPrice } from "@/platform/pricing";

/**
 * The module installer.
 *
 * Activation and deactivation, one module at a time, with the dependency graph
 * enforced and the consequences reported before they are a surprise on an
 * invoice.
 *
 * **Scoped to the organisation, not the factory.** Entitlements hang off
 * `Organization` because a company with two factories buys modules once for
 * both — a per-factory installer would let one site have Manufacturing and the
 * other not, which is not a product decision anyone wants to make. The HQ
 * console already carries `organizationId` for this reason.
 *
 * Both actions invalidate the entitlement cache explicitly. `entitledModules`
 * is held for 60 seconds, so a write that only calls `revalidatePath` leaves the
 * toggle looking broken for up to a minute — which is what
 * `updateTenantModules` did until this landed.
 */

/** Deactivations that are refused outright, with the reason. */
function blockers(moduleKey: ModuleKey, active: ModuleKey[]): string[] {
  return active
    .filter((key) => key !== moduleKey && (getModule(key)?.requires ?? []).includes(moduleKey))
    .map((key) => getModule(key)?.name ?? key);
}

export interface ActivationResult {
  success: true;
  /** Everything now newly entitled, including dependencies pulled in. */
  activated: ModuleKey[];
  /** Dependencies added that the operator did not ask for. */
  pulledIn: ModuleKey[];
  /** What this adds to the monthly bill, in paise. */
  costDelta: number;
  costDeltaLabel: string;
}

export type InstallerError = { success: false; error: string };

/**
 * Activate a module, pulling in whatever it requires.
 *
 * Dependencies are added rather than refused: entitling `manufacturing` without
 * `inventory` is a configuration mistake, not a decision, and making the
 * operator discover the graph by trial and error wastes their time. What is
 * *not* silent is the result — `pulledIn` and `costDelta` say exactly what
 * happened, because a module arriving unasked-for on an invoice is the kind of
 * surprise that costs trust.
 */
export async function activateModule(
  organizationId: string,
  moduleKey: string,
): Promise<ActivationResult | InstallerError> {
  await requireHqAction();

  const mod = getModule(moduleKey as ModuleKey);
  if (!mod) return { success: false, error: `Unknown module: ${moduleKey}` };

  const before = await entitledModules(organizationId);
  if (before.includes(mod.key)) {
    return {
      success: true,
      activated: [],
      pulledIn: [],
      costDelta: 0,
      costDeltaLabel: formatPrice(0),
    };
  }

  const resolved = withDependencies([mod.key]);
  const newlyActive = resolved.filter((key) => !before.includes(key));
  const pulledIn = newlyActive.filter((key) => key !== mod.key);
  const costDelta = newlyActive.reduce((sum, key) => sum + modulePrice(key), 0);

  try {
    await prisma.$transaction(
      newlyActive.map((key) =>
        prisma.moduleEntitlement.upsert({
          where: { organizationId_moduleKey: { organizationId, moduleKey: key } },
          create: { organizationId, moduleKey: key, enabled: true },
          update: { enabled: true, expiresAt: null },
        }),
      ),
    );

    // Before the audit log, so a failure here does not leave a log claiming a
    // change that did not stick.
    invalidate(`entitlements:${organizationId}`);

    // Billing follows entitlement. Without this the module works and is never
    // charged for, which is the failure nobody reports.
    await syncSubscriptionLines(organizationId).catch(() => undefined);

    await writeAudit(organizationId, `Activated ${mod.name}`, {
      moduleKey: mod.key,
      pulledIn,
      costDelta,
    });

    revalidatePath("/verity/clients");
    revalidatePath("/owner", "layout");

    return {
      success: true,
      activated: newlyActive,
      pulledIn,
      costDelta,
      costDeltaLabel: formatPrice(costDelta),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not activate that module.",
    };
  }
}

export interface DeactivationResult {
  success: true;
  deactivated: ModuleKey;
  /** What comes off the next bill, in paise. */
  costDelta: number;
  costDeltaLabel: string;
}

/**
 * Deactivate a module.
 *
 * Refused when something still depends on it, and refused for always-on modules.
 * Silently breaking a dependent is worse than a refusal an operator can read.
 *
 * **Hides, never deletes.** The guide promises this and a tenant who disables
 * Billing for a month must find their invoices when they re-enable it. Only the
 * entitlement row flips.
 */
export async function deactivateModule(
  organizationId: string,
  moduleKey: string,
): Promise<DeactivationResult | InstallerError> {
  await requireHqAction();

  const mod = getModule(moduleKey as ModuleKey);
  if (!mod) return { success: false, error: `Unknown module: ${moduleKey}` };

  if (alwaysOnModules().includes(mod.key)) {
    return {
      success: false,
      error: `${mod.name} is always on. Anything a tenant cannot function without belongs there.`,
    };
  }

  const active = await entitledModules(organizationId);
  if (!active.includes(mod.key)) {
    return { success: true, deactivated: mod.key, costDelta: 0, costDeltaLabel: formatPrice(0) };
  }

  const stillNeed = blockers(mod.key, active);
  if (stillNeed.length > 0) {
    return {
      success: false,
      error:
        `Cannot deactivate ${mod.name}: ${stillNeed.join(", ")} ` +
        `${stillNeed.length === 1 ? "depends" : "depend"} on it. Deactivate ${stillNeed.length === 1 ? "it" : "those"} first.`,
    };
  }

  try {
    await prisma.moduleEntitlement.updateMany({
      where: { organizationId, moduleKey: mod.key },
      data: { enabled: false },
    });

    invalidate(`entitlements:${organizationId}`);
    await syncSubscriptionLines(organizationId).catch(() => undefined);

    const costDelta = modulePrice(mod.key);
    await writeAudit(organizationId, `Deactivated ${mod.name}`, {
      moduleKey: mod.key,
      costDelta: -costDelta,
    });

    revalidatePath("/verity/clients");
    revalidatePath("/owner", "layout");

    return {
      success: true,
      deactivated: mod.key,
      costDelta: -costDelta,
      costDeltaLabel: `−${formatPrice(costDelta)}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not deactivate that module.",
    };
  }
}

/**
 * What activating a module would do, without doing it.
 *
 * The module store calls this to show dependencies and the price delta *before*
 * an operator confirms — the number shown is the number charged.
 */
export async function previewActivation(organizationId: string, moduleKey: string) {
  await requireHqAction();

  const mod = getModule(moduleKey as ModuleKey);
  if (!mod) return null;

  const before = await entitledModules(organizationId);
  const newlyActive = withDependencies([mod.key]).filter((key) => !before.includes(key));
  const costDelta = newlyActive.reduce((sum, key) => sum + modulePrice(key), 0);

  return {
    moduleKey: mod.key,
    name: mod.name,
    alreadyActive: before.includes(mod.key),
    pulledIn: newlyActive
      .filter((key) => key !== mod.key)
      .map((key) => ({ key, name: getModule(key)?.name ?? key, price: modulePrice(key) })),
    costDelta,
    costDeltaLabel: formatPrice(costDelta),
  };
}

/** Which modules can be deactivated right now, and why the rest cannot. */
export async function deactivationBlockers(organizationId: string) {
  await requireHqAction();
  const active = await entitledModules(organizationId);

  return allModules()
    .filter((mod) => active.includes(mod.key))
    .map((mod) => ({
      moduleKey: mod.key,
      name: mod.name,
      alwaysOn: mod.alwaysOn === true,
      blockedBy: mod.alwaysOn === true ? [] : blockers(mod.key, active),
    }));
}

/**
 * Audit, written against the organisation's first factory.
 *
 * `AuditLog` is factory-scoped while entitlements are organisation-scoped, so
 * there is no perfectly correct row to attach this to. The first factory is the
 * least wrong: it keeps the change visible in a place an operator already looks,
 * rather than dropping it because the shapes disagree.
 */
async function writeAudit(
  organizationId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const factory = await prisma.factory.findFirst({
    where: { organizationId },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!factory) return;

  await prisma.auditLog
    .create({
      data: {
        factoryId: factory.id,
        action,
        entityType: "ModuleEntitlement",
        entityId: String(metadata.moduleKey ?? ""),
        metadata: metadata as never,
      },
    })
    .catch(() => undefined);
}
