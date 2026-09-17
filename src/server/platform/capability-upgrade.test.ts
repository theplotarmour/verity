import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { withTenant } from "./tenancy";
import type { ActorContext } from "./command";
import { activateCapability, invalidateCapabilityCache } from "./capability";
import {
  CapabilityUpgradeError,
  applyCapabilityUpgrade,
  planCapabilityUpgrade,
  rollbackCapabilityUpgrade,
} from "./capability-upgrade";

/**
 * Tenant capability upgrade lifecycle (Authority: Task 108 WP-11A, VCA-008).
 *
 * Same throwaway-tenant pattern as `pack.test.ts`/`capability-registry.test.ts`.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-upgrade.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const CAPABILITY = `verity.capability.test_upgrade_${randomUUID().slice(0, 8)}`;
const DEPENDENCY = `verity.capability.test_upgrade_dep_${randomUUID().slice(0, 8)}`;

describeDb("Capability upgrade lifecycle (WP-11A)", () => {
  const tenantId = randomUUID();
  const userId = randomUUID();
  const membershipId = randomUUID();
  const organizationId = randomUUID();
  let roleId = "";
  let actor: ActorContext;

  beforeAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.capabilityDefinition.createMany({
        data: [
          { id: DEPENDENCY, name: "Test Upgrade Dependency", version: "1.0.0" },
          { id: CAPABILITY, name: "Test Upgrade Capability", version: "1.0.0", dependencies: [DEPENDENCY] },
        ],
      });
    } finally {
      await admin.$disconnect();
    }
    await withTenant(tenantId, (tx) => tx.tenant.create({ data: { id: tenantId, name: `T-upgrade-${tenantId.slice(0, 4)}` } }));
    const role = await withTenant(tenantId, (tx) => tx.role.create({ data: { tenantId, name: "UpgradeAdmin" } }));
    roleId = role.id;
    await withTenant(tenantId, (tx) =>
      tx.permission.create({
        data: { tenantId, roleId, verb: "ActionExecute", entity: "verity.platform.capability_upgrade", scope: "Tenant" },
      }),
    );
    actor = { tenantId, userId, membershipId, organizationId, roleId };
    await withTenant(tenantId, (tx) => activateCapability(tx, tenantId, DEPENDENCY));
    await withTenant(tenantId, (tx) => activateCapability(tx, tenantId, CAPABILITY));
  });

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantId}::uuid`;
      await admin.$executeRaw`DELETE FROM capability_definition WHERE id IN (${CAPABILITY}, ${DEPENDENCY})`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("refuses a plan when already pinned to the current version", async () => {
    await expect(
      withTenant(tenantId, (tx) => planCapabilityUpgrade(tx, actor, CAPABILITY, { reversible: true })),
    ).rejects.toThrow(/E_UPGRADE_ALREADY_CURRENT/);
  });

  it("plans, approves/applies, and moves the pin forward once a new version is registered", async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.capabilityDefinition.update({ where: { id: CAPABILITY }, data: { version: "1.1.0" } });
    } finally {
      await admin.$disconnect();
    }
    invalidateCapabilityCache(tenantId);

    const planned = await withTenant(tenantId, (tx) => planCapabilityUpgrade(tx, actor, CAPABILITY, { reversible: true }));
    expect(planned.diff.fromVersion).toBe("1.0.0");
    expect(planned.diff.toVersion).toBe("1.1.0");
    expect(planned.diff.dependenciesChecked).toContain(DEPENDENCY);

    const applied = await withTenant(tenantId, (tx) => applyCapabilityUpgrade(tx, actor, planned.operationId));
    expect(applied.pinnedVersion).toBe("1.1.0");

    const activation = await withTenant(tenantId, (tx) =>
      tx.tenantActivation.findUniqueOrThrow({ where: { tenantId_capabilityId: { tenantId, capabilityId: CAPABILITY } } }),
    );
    expect(activation.pinnedVersion).toBe("1.1.0");
  });

  it("rolls back a reversible upgrade and refuses a second rollback", async () => {
    const operation = await withTenant(tenantId, (tx) =>
      tx.capabilityUpgradeOperation.findFirstOrThrow({ where: { tenantId, capabilityId: CAPABILITY, state: "Completed" } }),
    );
    const rolledBack = await withTenant(tenantId, (tx) => rollbackCapabilityUpgrade(tx, actor, operation.id));
    expect(rolledBack.pinnedVersion).toBe("1.0.0");

    await expect(withTenant(tenantId, (tx) => rollbackCapabilityUpgrade(tx, actor, operation.id))).rejects.toThrow(
      /E_UPGRADE_OPERATION_STATE/,
    );
  });

  it("refuses rollback for an upgrade that was not planned reversible", async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.capabilityDefinition.update({ where: { id: CAPABILITY }, data: { version: "1.2.0" } });
    } finally {
      await admin.$disconnect();
    }
    invalidateCapabilityCache(tenantId);

    const planned = await withTenant(tenantId, (tx) => planCapabilityUpgrade(tx, actor, CAPABILITY, { reversible: false }));
    const applied = await withTenant(tenantId, (tx) => applyCapabilityUpgrade(tx, actor, planned.operationId));
    expect(applied.pinnedVersion).toBe("1.2.0");

    await expect(
      withTenant(tenantId, (tx) => rollbackCapabilityUpgrade(tx, actor, planned.operationId)),
    ).rejects.toThrow(CapabilityUpgradeError);
  });

  it("refuses to upgrade when a dependency is stale", async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.capabilityDefinition.update({ where: { id: CAPABILITY }, data: { version: "1.3.0" } });
      await admin.capabilityDefinition.update({ where: { id: DEPENDENCY }, data: { version: "2.0.0" } });
    } finally {
      await admin.$disconnect();
    }
    invalidateCapabilityCache(tenantId);

    await expect(
      withTenant(tenantId, (tx) => planCapabilityUpgrade(tx, actor, CAPABILITY, { reversible: true })),
    ).rejects.toThrow(/E_UPGRADE_DEPENDENCY_INCOMPATIBLE/);
  });
});
