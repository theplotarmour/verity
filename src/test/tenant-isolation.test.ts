import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";

/**
 * Phase 0 gate test — INV-001, Spec PLA-TEN-001→006.
 *
 * Proves tenant isolation is enforced by the database rather than by query
 * construction, so a capability that forgets to filter still cannot read or
 * write across tenants.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message =
    "tenant-isolation.test.ts cannot run: DATABASE_URL is unset, so INV-001 is NOT verified.";
  // Skipping this suite must never read as a passing run. Locally it is a loud
  // warning; in CI it is a hard failure, because this is the Phase 0 gate.
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

describeDb("tenant isolation (INV-001)", () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let orgA: string;
  let orgB: string;

  beforeAll(async () => {
    // A role that bypasses RLS makes every assertion below vacuous.
    await assertRlsEnforceable();

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Tenant A" } });
      orgA = (await tx.organization.create({ data: { tenantId: tenantA, name: "A HQ" } })).id;
    });
    await withTenant(tenantB, async (tx) => {
      await tx.tenant.create({ data: { id: tenantB, name: "Tenant B" } });
      orgB = (await tx.organization.create({ data: { tenantId: tenantB, name: "B HQ" } })).id;
    });
  });

  afterAll(async () => {
    // Leave no rows behind: this suite runs against a real database.
    // Children first — the self-referential parent FK is ON DELETE RESTRICT.
    for (const id of [tenantA, tenantB]) {
      await withTenant(id, async (tx) => {
        await tx.organization.deleteMany({ where: { parentId: { not: null } } });
        await tx.organization.deleteMany({});
        await tx.tenant.deleteMany({});
      });
    }
    await prisma.$disconnect();
  });

  it("shows a tenant only its own tenant row", async () => {
    const rows = await withTenant(tenantA, (tx) => tx.tenant.findMany());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Tenant A");
  });

  it("shows a tenant only its own organizations", async () => {
    const rows = await withTenant(tenantA, (tx) => tx.organization.findMany());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(orgA);
  });

  it("returns nothing when no tenant context is set (fails closed)", async () => {
    const tenants = await prisma.tenant.findMany();
    const orgs = await prisma.organization.findMany();
    expect(tenants).toHaveLength(0);
    expect(orgs).toHaveLength(0);
  });

  it("refuses a write owned by another tenant", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.organization.create({ data: { tenantId: tenantB, name: "smuggled" } }),
      ),
    ).rejects.toThrow();
  });

  it("refuses to move a row into another tenant", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.organization.update({ where: { id: orgA }, data: { tenantId: tenantB } }),
      ),
    ).rejects.toThrow();
  });

  it("refuses a write with no tenant context", async () => {
    await expect(
      prisma.organization.create({ data: { tenantId: tenantA, name: "no context" } }),
    ).rejects.toThrow();
  });

  it("refuses a cross-tenant parent organization (PLA-TEN-003)", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.organization.create({
          data: { tenantId: tenantA, parentId: orgB, name: "child of B" },
        }),
      ),
    ).rejects.toThrow();
  });

  it("allows same-tenant nesting (PLA-ORG-001)", async () => {
    const child = await withTenant(tenantA, (tx) =>
      tx.organization.create({
        data: { tenantId: tenantA, parentId: orgA, name: "A Region" },
      }),
    );
    expect(child.parentId).toBe(orgA);
  });

  it("leaves the other tenant's view unchanged", async () => {
    const rows = await withTenant(tenantB, (tx) => tx.organization.findMany());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(orgB);
  });
});
