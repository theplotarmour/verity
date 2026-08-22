import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { provisionIdentity } from "@/server/platform/identity";

/**
 * Identity and membership gate test.
 *
 * Authority: INV-001, INV-003, GOV-TER-006, Bible V2 Primitive 2 §2/§13,
 * Bible V5 §1.A.4, Spec PLA-IDE-001→004.
 *
 * Party and User are global tables (Bible V2 Primitive 2 §2), so isolation
 * cannot come from a tenant column. It comes from reachability: a tenant sees an
 * identity only through a TenantMembership it owns. The subcontractor case
 * (PLA-IDE-004) is the one that proves both invariants at once — one Party row
 * shared across two tenants, with neither able to see the other's people.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message =
    "identity-membership.test.ts cannot run: DATABASE_URL is unset, so INV-001/INV-003 are NOT verified.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

describeDb("identity and membership", () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  let orgA: string;
  let orgB: string;
  let alicePartyId: string;
  let aliceUserId: string;
  let samPartyId: string;
  let samUserId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();

    await withTenant(tenantA, async (tx) => {
      await tx.tenant.create({ data: { id: tenantA, name: "Tenant A" } });
      orgA = (await tx.organization.create({ data: { tenantId: tenantA, name: "A HQ" } })).id;
    });
    await withTenant(tenantB, async (tx) => {
      await tx.tenant.create({ data: { id: tenantB, name: "Tenant B" } });
      orgB = (await tx.organization.create({ data: { tenantId: tenantB, name: "B HQ" } })).id;
    });

    // Alice belongs to tenant A only.
    const alice = await withTenant(tenantA, (tx) =>
      provisionIdentity(tx, {
        organizationId: orgA,
        authUserId: randomUUID(),
        displayName: "Alice",
      }),
    );
    alicePartyId = alice.partyId;
    aliceUserId = alice.userId;

    // Sam is one identity with memberships in BOTH tenants (PLA-IDE-004).
    const sam = await withTenant(tenantA, (tx) =>
      provisionIdentity(tx, {
        organizationId: orgA,
        authUserId: randomUUID(),
        displayName: "Sam Subcontractor",
      }),
    );
    samPartyId = sam.partyId;
    samUserId = sam.userId;
    await withTenant(tenantB, (tx) =>
      tx.tenantMembership.create({
        data: { tenantId: tenantB, organizationId: orgB, userId: samUserId },
      }),
    );
  });

  afterAll(async () => {
    // Teardown deliberately uses an admin connection rather than the app role.
    //
    // There is no order in which the app role can remove these rows: deleting a
    // User makes its Party unreachable, and deleting the Party first is blocked
    // by the RESTRICT foreign key. That is correct — Bible V2 Primitive 2 §3
    // ends the Party lifecycle at `Archived`, so hard-deleting an identity is
    // not a platform operation and no such path should exist for capabilities.
    // Purging test fixtures is not a platform operation either, so it runs on
    // DIRECT_URL (the migration role, which bypasses RLS) and stays here.
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM "user" WHERE id IN (${aliceUserId}::uuid, ${samUserId}::uuid)`;
      await admin.$executeRaw`DELETE FROM party WHERE id IN (${alicePartyId}::uuid, ${samPartyId}::uuid)`;
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid)`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("shows a tenant every identity that holds a membership in it", async () => {
    const parties = await withTenant(tenantA, (tx) =>
      tx.party.findMany({ orderBy: { displayName: "asc" } }),
    );
    expect(parties.map((p) => p.displayName)).toEqual(["Alice", "Sam Subcontractor"]);
  });

  it("hides identities that hold no membership in the tenant", async () => {
    const parties = await withTenant(tenantB, (tx) => tx.party.findMany());
    expect(parties.map((p) => p.displayName)).toEqual(["Sam Subcontractor"]);
    expect(parties.find((p) => p.id === alicePartyId)).toBeUndefined();
  });

  it("backs both tenants with a single Party row (INV-003)", async () => {
    const seenByA = await withTenant(tenantA, (tx) =>
      tx.user.findUnique({ where: { id: samUserId }, include: { party: true } }),
    );
    const seenByB = await withTenant(tenantB, (tx) =>
      tx.user.findUnique({ where: { id: samUserId }, include: { party: true } }),
    );
    expect(seenByA?.party.id).toBe(samPartyId);
    expect(seenByB?.party.id).toBe(samPartyId);
  });

  it("returns no identities without a tenant context (fails closed)", async () => {
    expect(await prisma.party.findMany()).toHaveLength(0);
    expect(await prisma.user.findMany()).toHaveLength(0);
    expect(await prisma.tenantMembership.findMany()).toHaveLength(0);
  });

  it("does not let a tenant modify an identity it cannot reach", async () => {
    const updated = await withTenant(tenantB, (tx) =>
      tx.party.updateMany({ where: { id: alicePartyId }, data: { displayName: "hijacked" } }),
    );
    expect(updated.count).toBe(0);

    const alice = await withTenant(tenantA, (tx) =>
      tx.party.findUnique({ where: { id: alicePartyId } }),
    );
    expect(alice?.displayName).toBe("Alice");
  });

  it("does not let a tenant delete an identity it cannot reach", async () => {
    const deleted = await withTenant(tenantB, (tx) =>
      tx.party.deleteMany({ where: { id: alicePartyId } }),
    );
    expect(deleted.count).toBe(0);
  });

  it("refuses a membership pointing at another tenant's organization", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.tenantMembership.create({
          data: { tenantId: tenantA, organizationId: orgB, userId: aliceUserId },
        }),
      ),
    ).rejects.toThrow();
  });

  it("enforces one User per Party (GOV-TER-006, 1:1)", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        tx.user.create({ data: { authUserId: randomUUID(), partyId: alicePartyId } }),
      ),
    ).rejects.toThrow();
  });

  it("refuses to create an identity with no tenant context", async () => {
    await expect(prisma.party.create({ data: { displayName: "no context" } })).rejects.toThrow();
  });

  it("defaults a new Party to the Invited state (Bible V2 Primitive 2 §3)", async () => {
    const alice = await withTenant(tenantA, (tx) =>
      tx.party.findUnique({ where: { id: alicePartyId } }),
    );
    expect(alice?.state).toBe("Invited");
  });

  it("denies direct creation of a Party outside the provisioning path", async () => {
    await expect(
      withTenant(tenantA, (tx) => tx.party.create({ data: { displayName: "direct insert" } })),
    ).rejects.toThrow();
  });

  it("refuses to provision into another tenant's organization", async () => {
    await expect(
      withTenant(tenantA, (tx) =>
        provisionIdentity(tx, {
          organizationId: orgB,
          authUserId: randomUUID(),
          displayName: "cross tenant",
        }),
      ),
    ).rejects.toThrow(/does not belong to the current tenant/);
  });
});
