import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import {
  CapabilityError,
  activateCapability,
  capabilityForEntity,
  invalidateCapabilityCache,
  isCapabilityActive,
  requireCapabilityActive,
  resolveConfig,
  setConfig,
  suspendCapability,
} from "@/server/platform/capability";

/**
 * Capability registry gate test.
 * Authority: PLA-CAP-001→004, PLA-CFG-001, PLA-VER-002→003.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "capability-registry.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

const WORKFORCE = "verity.capability.test_workforce";
const SCHEDULING = "verity.capability.test_scheduling";
const ENTITY = "verity.test.shift";

describeDb("capability registry", () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const orgId = randomUUID();
  const userId = randomUUID();

  beforeAll(async () => {
    await assertRlsEnforceable();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.capabilityDefinition.createMany({
        data: [
          { id: WORKFORCE, name: "Test Workforce", version: "1.0.0", entityTypes: [ENTITY] },
          { id: SCHEDULING, name: "Test Scheduling", version: "2.1.0", dependencies: [WORKFORCE] },
        ],
      });
      await admin.entityDefinition.create({
        data: { key: ENTITY, capability: WORKFORCE, class: "Persistent", tableName: "shift" },
      });
      // A platform default at Global scope; no tenant may author one.
      await admin.configParameter.create({
        data: { key: "test.shift_length_hours", value: 8, scope: "Global", tenantId: null },
      });
    } finally {
      await admin.$disconnect();
    }
    for (const id of [tenantA, tenantB]) {
      await withTenant(id, (tx) => tx.tenant.create({ data: { id, name: `T-${id.slice(0, 4)}` } }));
    }
  });

  beforeEach(() => invalidateCapabilityCache());

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`;
      await admin.$executeRaw`DELETE FROM entity_definition WHERE key = ${ENTITY}`;
      await admin.$executeRaw`DELETE FROM capability_definition WHERE id IN (${WORKFORCE}, ${SCHEDULING})`;
      await admin.$executeRaw`DELETE FROM config_parameter WHERE key = 'test.shift_length_hours'`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("refuses activation while a dependency is inactive (PLA-CAP-003)", async () => {
    await expect(
      withTenant(tenantA, (tx) => activateCapability(tx, tenantA, SCHEDULING)),
    ).rejects.toThrow(/missing active dependencies/);
  });

  it("permits activation once the dependency is active", async () => {
    await withTenant(tenantA, (tx) => activateCapability(tx, tenantA, WORKFORCE));
    await expect(
      withTenant(tenantA, (tx) => activateCapability(tx, tenantA, SCHEDULING)),
    ).resolves.toBeUndefined();
  });

  it("pins the version at activation (PLA-VER-003)", async () => {
    const row = await withTenant(tenantA, (tx) =>
      tx.tenantActivation.findFirstOrThrow({ where: { capabilityId: SCHEDULING } }),
    );
    expect(row.pinnedVersion).toBe("2.1.0");
  });

  it("refuses to suspend a capability others still depend on", async () => {
    await expect(
      withTenant(tenantA, (tx) => suspendCapability(tx, tenantA, WORKFORCE)),
    ).rejects.toThrow(/still required by/);
  });

  it("permits suspension once no dependants remain", async () => {
    await withTenant(tenantA, (tx) => suspendCapability(tx, tenantA, SCHEDULING));
    await expect(
      withTenant(tenantA, (tx) => suspendCapability(tx, tenantA, WORKFORCE)),
    ).resolves.toBeUndefined();
    // Restore for later assertions.
    await withTenant(tenantA, (tx) => activateCapability(tx, tenantA, WORKFORCE));
  });

  it("reports activation per tenant, not globally", async () => {
    const forA = await withTenant(tenantA, (tx) => isCapabilityActive(tx, tenantA, WORKFORCE));
    const forB = await withTenant(tenantB, (tx) => isCapabilityActive(tx, tenantB, WORKFORCE));
    expect(forA).toBe(true);
    expect(forB).toBe(false);
  });

  it("blocks work for an inactive capability (PLA-CAP-002)", async () => {
    await expect(
      withTenant(tenantB, (tx) => requireCapabilityActive(tx, tenantB, WORKFORCE)),
    ).rejects.toBeInstanceOf(CapabilityError);
  });

  it("resolves an entity to its owning capability", async () => {
    const owner = await withTenant(tenantA, (tx) => capabilityForEntity(tx, ENTITY));
    expect(owner).toBe(WORKFORCE);
  });

  it("serves repeat checks from cache without re-querying (PLA-CAP-004)", async () => {
    await withTenant(tenantA, (tx) => isCapabilityActive(tx, tenantA, WORKFORCE));
    // Suspend directly in the database, bypassing the cache invalidation path.
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`
        UPDATE tenant_activation SET status = 'Suspended'
        WHERE tenant_id = ${tenantA}::uuid AND capability_id = ${WORKFORCE}`;
    } finally {
      await admin.$disconnect();
    }
    // Still true: the answer came from memory, which is the point of PLA-CAP-004.
    expect(await withTenant(tenantA, (tx) => isCapabilityActive(tx, tenantA, WORKFORCE))).toBe(true);
    // And correct again once invalidated.
    invalidateCapabilityCache(tenantA);
    expect(await withTenant(tenantA, (tx) => isCapabilityActive(tx, tenantA, WORKFORCE))).toBe(false);

    const admin2 = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin2.$executeRaw`
        UPDATE tenant_activation SET status = 'Active'
        WHERE tenant_id = ${tenantA}::uuid AND capability_id = ${WORKFORCE}`;
    } finally {
      await admin2.$disconnect();
    }
    invalidateCapabilityCache(tenantA);
  });

  it("falls back to the global default when a tenant sets nothing (PLA-CFG-001)", async () => {
    const value = await withTenant(tenantA, (tx) => resolveConfig<number>(tx, "test.shift_length_hours"));
    expect(value).toBe(8);
  });

  it("prefers a tenant value over the global default", async () => {
    await withTenant(tenantA, (tx) => setConfig(tx, tenantA, "test.shift_length_hours", 10));
    const value = await withTenant(tenantA, (tx) => resolveConfig<number>(tx, "test.shift_length_hours"));
    expect(value).toBe(10);
  });

  it("prefers an organization value over the tenant value", async () => {
    await withTenant(tenantA, (tx) =>
      setConfig(tx, tenantA, "test.shift_length_hours", 12, "Organization", orgId),
    );
    const value = await withTenant(tenantA, (tx) =>
      resolveConfig<number>(tx, "test.shift_length_hours", { organizationId: orgId }),
    );
    expect(value).toBe(12);
  });

  it("prefers a user value over everything narrower-out", async () => {
    await withTenant(tenantA, (tx) =>
      setConfig(tx, tenantA, "test.shift_length_hours", 6, "User", userId),
    );
    const value = await withTenant(tenantA, (tx) =>
      resolveConfig<number>(tx, "test.shift_length_hours", { userId, organizationId: orgId }),
    );
    expect(value).toBe(6);
  });

  it("keeps the global default visible but unwritable by a tenant", async () => {
    const globalForB = await withTenant(tenantB, (tx) =>
      resolveConfig<number>(tx, "test.shift_length_hours"),
    );
    expect(globalForB).toBe(8);

    await expect(
      withTenant(tenantB, (tx) =>
        tx.configParameter.create({
          data: { key: "test.rogue_global", value: 1, scope: "Global", tenantId: null },
        }),
      ),
    ).rejects.toThrow();
  });

  it("keeps one tenant's configuration invisible to another", async () => {
    const seen = await withTenant(tenantB, (tx) =>
      tx.configParameter.findMany({ where: { scope: { not: "Global" } } }),
    );
    expect(seen).toHaveLength(0);
  });
});
