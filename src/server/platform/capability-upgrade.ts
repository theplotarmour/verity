import { randomUUID } from "node:crypto";
import type { ActorContext } from "./command";
import type { TenantScopedClient } from "./tenancy";
import { enforcePolicy } from "./policy";
import { invalidateCapabilityCache } from "./capability";
import { recordSecurityEvent } from "./audit";

/**
 * Tenant capability upgrade lifecycle (Authority: Task 108 WP-11A, VCA-008).
 *
 * `TenantActivation.pinnedVersion` is the enforced runtime contract
 * (ADR-021, `requireCapabilityReady` in `capability.ts`) — this module is
 * what walks it forward safely. It does not replace `activateCapability`
 * (first activation still pins at whatever version is current); it exists
 * for the case ADR-021 itself calls out: "a platform upgrade cannot
 * silently change a tenant's behaviour" — moving a tenant that is ALREADY
 * active on an old pin to a newer one is a deliberate, audited operation,
 * never an implicit side effect of a deploy.
 */

const CAPABILITY_UPGRADE_ENTITY = "verity.platform.capability_upgrade";

export class CapabilityUpgradeError extends Error {
  constructor(
    readonly code:
      | "E_UPGRADE_UNKNOWN_CAPABILITY"
      | "E_UPGRADE_NOT_ACTIVE"
      | "E_UPGRADE_ALREADY_CURRENT"
      | "E_UPGRADE_DEPENDENCY_INCOMPATIBLE"
      | "E_UPGRADE_OPERATION_STATE"
      | "E_UPGRADE_ROLLBACK_UNSUPPORTED"
      | "E_UPGRADE_NOT_LATEST",
    message: string,
  ) {
    super(message);
    this.name = "CapabilityUpgradeError";
  }
}

export type CapabilityUpgradeDiff = {
  capabilityId: string;
  fromVersion: string | null;
  toVersion: string;
  dependenciesChecked: string[];
};

async function requirePolicy(tx: TenantScopedClient, actor: ActorContext): Promise<void> {
  await enforcePolicy(tx, actor, { verb: "ActionExecute", entity: CAPABILITY_UPGRADE_ENTITY, channel: "human" });
}

/**
 * Dry run (WP-11A §"Create dry-run output"). Computes the diff and validates
 * dependency compatibility without writing anything but the operation's own
 * `Planned` row — the platform's standard "plan, then approve, then apply"
 * shape (same one `pack.ts` uses for the Industry Pack lifecycle).
 */
export async function planCapabilityUpgrade(
  tx: TenantScopedClient,
  actor: ActorContext,
  capabilityId: string,
  options: { reversible: boolean },
): Promise<{ operationId: string; diff: CapabilityUpgradeDiff }> {
  await requirePolicy(tx, actor);

  const definition = await tx.capabilityDefinition.findUnique({ where: { id: capabilityId } });
  if (!definition) {
    throw new CapabilityUpgradeError("E_UPGRADE_UNKNOWN_CAPABILITY", `E_UPGRADE_UNKNOWN_CAPABILITY: ${capabilityId}`);
  }
  const activation = await tx.tenantActivation.findUnique({
    where: { tenantId_capabilityId: { tenantId: actor.tenantId, capabilityId } },
  });
  if (!activation || activation.status !== "Active") {
    throw new CapabilityUpgradeError("E_UPGRADE_NOT_ACTIVE", `E_UPGRADE_NOT_ACTIVE: ${capabilityId} is not active for this tenant`);
  }
  if (activation.pinnedVersion === definition.version) {
    throw new CapabilityUpgradeError(
      "E_UPGRADE_ALREADY_CURRENT",
      `E_UPGRADE_ALREADY_CURRENT: ${capabilityId} is already pinned to ${definition.version}`,
    );
  }

  const dependenciesChecked: string[] = [];
  for (const dependencyId of definition.dependencies) {
    const dependencyActivation = await tx.tenantActivation.findUnique({
      where: { tenantId_capabilityId: { tenantId: actor.tenantId, capabilityId: dependencyId } },
    });
    const dependencyDefinition = await tx.capabilityDefinition.findUnique({ where: { id: dependencyId } });
    dependenciesChecked.push(dependencyId);
    if (
      !dependencyActivation ||
      dependencyActivation.status !== "Active" ||
      !dependencyDefinition ||
      // The dependency must itself already be current — an upgrade cannot
      // leave the tenant depending on a capability that is itself stale,
      // because `requireCapabilityReady` would then refuse it anyway.
      dependencyActivation.pinnedVersion !== dependencyDefinition.version
    ) {
      throw new CapabilityUpgradeError(
        "E_UPGRADE_DEPENDENCY_INCOMPATIBLE",
        `E_UPGRADE_DEPENDENCY_INCOMPATIBLE: dependency ${dependencyId} is not active and current`,
      );
    }
  }

  const diff: CapabilityUpgradeDiff = {
    capabilityId,
    fromVersion: activation.pinnedVersion,
    toVersion: definition.version,
    dependenciesChecked,
  };

  const operation = await tx.capabilityUpgradeOperation.create({
    data: {
      tenantId: actor.tenantId,
      capabilityId,
      fromVersion: activation.pinnedVersion,
      toVersion: definition.version,
      state: "Planned",
      reversible: options.reversible,
      diff: diff as never,
      correlationId: randomUUID(),
    },
  });

  return { operationId: operation.id, diff };
}

/**
 * Applies a planned upgrade (WP-11A §"Prevent execution when recorded
 * version and loaded handler/config/data contract are incompatible" — this
 * IS that prevention, made durable and auditable rather than an implicit
 * `UPDATE`). `pinnedVersion` is written only after re-verifying every
 * precondition inside the same transaction, so a failure here can never
 * leave `TenantActivation` pointing at a version nothing actually verified.
 */
export async function applyCapabilityUpgrade(
  tx: TenantScopedClient,
  actor: ActorContext,
  operationId: string,
): Promise<{ pinnedVersion: string }> {
  await requirePolicy(tx, actor);

  const operation = await tx.capabilityUpgradeOperation.findUnique({ where: { id: operationId } });
  if (!operation || operation.tenantId !== actor.tenantId) {
    throw new CapabilityUpgradeError("E_UPGRADE_UNKNOWN_CAPABILITY", `E_UPGRADE_UNKNOWN_CAPABILITY: operation ${operationId}`);
  }
  if (operation.state !== "Planned" && operation.state !== "Preflighted") {
    throw new CapabilityUpgradeError("E_UPGRADE_OPERATION_STATE", `E_UPGRADE_OPERATION_STATE: operation is ${operation.state}`);
  }

  try {
    await tx.capabilityUpgradeOperation.update({
      where: { id: operation.id },
      data: { state: "Applying", approvedByUserId: actor.userId },
    });

    // Re-check the exact preconditions `planCapabilityUpgrade` verified — a
    // dependency may have been suspended, or the definition re-bumped, in
    // the window between plan and approve.
    const definition = await tx.capabilityDefinition.findUniqueOrThrow({ where: { id: operation.capabilityId } });
    if (definition.version !== operation.toVersion) {
      throw new CapabilityUpgradeError(
        "E_UPGRADE_NOT_LATEST",
        `E_UPGRADE_NOT_LATEST: plan targeted ${operation.toVersion}, platform now serves ${definition.version} — replan`,
      );
    }
    for (const dependencyId of definition.dependencies) {
      const dependencyActivation = await tx.tenantActivation.findUnique({
        where: { tenantId_capabilityId: { tenantId: actor.tenantId, capabilityId: dependencyId } },
      });
      const dependencyDefinition = await tx.capabilityDefinition.findUnique({ where: { id: dependencyId } });
      if (
        !dependencyActivation ||
        dependencyActivation.status !== "Active" ||
        !dependencyDefinition ||
        dependencyActivation.pinnedVersion !== dependencyDefinition.version
      ) {
        throw new CapabilityUpgradeError(
          "E_UPGRADE_DEPENDENCY_INCOMPATIBLE",
          `E_UPGRADE_DEPENDENCY_INCOMPATIBLE: dependency ${dependencyId} is not active and current`,
        );
      }
    }

    await tx.capabilityUpgradeOperation.update({ where: { id: operation.id }, data: { state: "Verifying" } });

    await tx.tenantActivation.update({
      where: { tenantId_capabilityId: { tenantId: actor.tenantId, capabilityId: operation.capabilityId } },
      data: { pinnedVersion: operation.toVersion },
    });
    invalidateCapabilityCache(actor.tenantId);

    // Prove the write actually produced a ready capability before calling the
    // operation Completed — the same "verify before claiming Active" rule
    // WP-10's pack apply follows.
    const verified = await tx.tenantActivation.findUniqueOrThrow({
      where: { tenantId_capabilityId: { tenantId: actor.tenantId, capabilityId: operation.capabilityId } },
    });
    if (verified.pinnedVersion !== definition.version || verified.status !== "Active") {
      throw new CapabilityUpgradeError(
        "E_UPGRADE_OPERATION_STATE",
        "E_UPGRADE_OPERATION_STATE: post-write verification failed — activation is not ready at the target version",
      );
    }

    await tx.capabilityUpgradeOperation.update({
      where: { id: operation.id },
      data: { state: "Completed", completedAt: new Date() },
    });

    await recordSecurityEvent(tx, {
      tenantId: actor.tenantId,
      eventType: "ConfigurationChanged",
      actorUserId: actor.userId,
      payload: { reason: "capability_upgrade", capabilityId: operation.capabilityId, fromVersion: operation.fromVersion, toVersion: operation.toVersion },
      correlationId: operation.correlationId,
    });

    return { pinnedVersion: operation.toVersion };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown capability upgrade failure";
    await tx.capabilityUpgradeOperation.update({
      where: { id: operation.id },
      data: { state: "Failed", error: message, completedAt: new Date() },
    });
    throw error;
  }
}

/**
 * Reverts the PIN only (WP-11A §"code/config-only rollback" vs "reversible
 * tenant data migration" vs "irreversible boundary"). Refused unless the
 * completed operation was explicitly planned `reversible: true` — this
 * platform does not promise independent tenant code rollback it cannot
 * deliver (ADR-021), so a plan that never asserted reversibility stays
 * irreversible by default, the safe direction to fail in.
 */
export async function rollbackCapabilityUpgrade(
  tx: TenantScopedClient,
  actor: ActorContext,
  operationId: string,
): Promise<{ pinnedVersion: string | null }> {
  await requirePolicy(tx, actor);

  const operation = await tx.capabilityUpgradeOperation.findUnique({ where: { id: operationId } });
  if (!operation || operation.tenantId !== actor.tenantId) {
    throw new CapabilityUpgradeError("E_UPGRADE_UNKNOWN_CAPABILITY", `E_UPGRADE_UNKNOWN_CAPABILITY: operation ${operationId}`);
  }
  if (operation.state !== "Completed") {
    throw new CapabilityUpgradeError("E_UPGRADE_OPERATION_STATE", `E_UPGRADE_OPERATION_STATE: operation is ${operation.state}, not Completed`);
  }
  if (!operation.reversible) {
    throw new CapabilityUpgradeError(
      "E_UPGRADE_ROLLBACK_UNSUPPORTED",
      "E_UPGRADE_ROLLBACK_UNSUPPORTED: this upgrade was not planned as reversible",
    );
  }

  const latest = await tx.capabilityUpgradeOperation.findFirst({
    where: { tenantId: actor.tenantId, capabilityId: operation.capabilityId },
    orderBy: { startedAt: "desc" },
  });
  if (latest?.id !== operation.id) {
    throw new CapabilityUpgradeError(
      "E_UPGRADE_OPERATION_STATE",
      "E_UPGRADE_OPERATION_STATE: a later operation exists — roll that one back first",
    );
  }

  await tx.tenantActivation.update({
    where: { tenantId_capabilityId: { tenantId: actor.tenantId, capabilityId: operation.capabilityId } },
    data: { pinnedVersion: operation.fromVersion },
  });
  invalidateCapabilityCache(actor.tenantId);

  const rollbackOperation = await tx.capabilityUpgradeOperation.create({
    data: {
      tenantId: actor.tenantId,
      capabilityId: operation.capabilityId,
      kind: "Rollback",
      fromVersion: operation.toVersion,
      toVersion: operation.fromVersion ?? operation.toVersion,
      state: "RolledBack",
      reversible: false,
      diff: { rolledBackOperationId: operation.id } as never,
      approvedByUserId: actor.userId,
      completedAt: new Date(),
      correlationId: randomUUID(),
    },
  });

  await recordSecurityEvent(tx, {
    tenantId: actor.tenantId,
    eventType: "ConfigurationChanged",
    actorUserId: actor.userId,
    payload: { reason: "capability_upgrade_rollback", capabilityId: operation.capabilityId, toVersion: operation.fromVersion },
    correlationId: rollbackOperation.correlationId,
  });

  return { pinnedVersion: operation.fromVersion };
}

