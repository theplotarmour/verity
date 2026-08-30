import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { withTenant } from "@/server/platform/tenancy";
import { provisionIdentity } from "@/server/platform/identity";
import {
  bootstrapOperator,
  OPERATOR_ENTITY,
  OPERATOR_ROLE_NAME,
} from "../../prisma/operator-bootstrap-core";

/**
 * `prisma/operator-bootstrap-core.ts` (Task 31) — the logic behind
 * `bootstrap-operator.ts`.
 *
 * CAUTION, READ BEFORE EDITING: this function operates on the PLATFORM
 * tenant, which is GLOBAL and SHARED — not a tenant this test creates and
 * can freely drop. A real platform tenant already exists in this project's
 * database (confirmed before writing this file: `SELECT id, name FROM
 * tenant WHERE is_platform` returns exactly one row, "Verity Platform").
 * Granting a throwaway test identity operator authority in it is safe
 * ONLY because this test cleans up precisely: it deletes the ONE
 * TenantMembership row it created (by tenant+user id, never by a blanket
 * tenant delete) and leaves the platform tenant, its "Verity Operator"
 * role, and that role's grant completely untouched — those are shared
 * infrastructure other real operators may depend on.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "bootstrap-operator.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

describeDb("bootstrapOperator()", () => {
  const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
  const testTenantId = randomUUID();
  const testEmail = `bootstrap-operator-test-${randomUUID()}@example.com`;
  let testUserId: string;
  let testPartyId: string;
  let platformTenantId: string;

  beforeAll(async () => {
    await withTenant(testTenantId, async (tx) => {
      await tx.tenant.create({ data: { id: testTenantId, name: "Bootstrap Operator Test" } });
      const org = await tx.organization.create({
        data: { tenantId: testTenantId, name: "HQ" },
        select: { id: true },
      });
      const identity = await provisionIdentity(tx, {
        organizationId: org.id,
        authUserId: randomUUID(),
        displayName: "Bootstrap Operator Test User",
        email: testEmail,
      });
      testUserId = identity.userId;
      testPartyId = identity.partyId;
    });
  });

  afterAll(async () => {
    // Precise cleanup only — never a blanket delete of the platform tenant.
    // Order matches identity-membership.test.ts's own teardown: User/Party
    // are global tables (Bible V2 Primitive 2 §2), not removed by deleting a
    // tenant, and deleting Party before User is blocked by a RESTRICT FK.
    await admin.$executeRaw`
      DELETE FROM tenant_membership
      WHERE tenant_id = ${platformTenantId}::uuid AND user_id = ${testUserId}::uuid`;
    await admin.$executeRaw`DELETE FROM "user" WHERE id = ${testUserId}::uuid`;
    await admin.$executeRaw`DELETE FROM party WHERE id = ${testPartyId}::uuid`;
    await admin.$executeRaw`DELETE FROM tenant WHERE id = ${testTenantId}::uuid`;
    await admin.$disconnect();
  });

  it("grants operator authority to a known identity, reusing the one platform tenant", async () => {
    const result = await bootstrapOperator(admin, testEmail);
    platformTenantId = result.tenantId;

    // Found while proving Task 38 on a freshly migrated database: this
    // assertion used to be `platformTenantCreated === false`, which encoded
    // the *hosted* project's existing state as a requirement. On a genuinely
    // empty deployment — the state Task 43 accepts from — the first bootstrap
    // legitimately creates the platform tenant, so the test failed on the run
    // that mattered most and passed on every run afterwards.
    //
    // The real property is not "it never creates one"; it is "there is exactly
    // one, and a second call finds it". That holds on both an established
    // database and a fresh one, and it is what the next assertion checks.
    expect(result.membershipOutcome).toBe("created");

    const platformTenants = await admin.tenant.findMany({ where: { isPlatform: true } });
    expect(platformTenants).toHaveLength(1);
    expect(platformTenants[0]!.id).toBe(platformTenantId);

    const membership = await admin.tenantMembership.findFirst({
      where: { tenantId: platformTenantId, userId: testUserId },
      include: { role: { select: { name: true } } },
    });
    expect(membership?.role?.name).toBe(OPERATOR_ROLE_NAME);
  });

  it("is idempotent: a second call for the same identity makes no further change", async () => {
    const result = await bootstrapOperator(admin, testEmail);

    expect(result.tenantId).toBe(platformTenantId);
    expect(result.roleCreated).toBe(false);
    expect(result.grantCreated).toBe(false);
    expect(result.membershipOutcome).toBe("already_operator");

    // Exactly one membership row — not duplicated by the second call.
    const memberships = await admin.tenantMembership.findMany({
      where: { tenantId: platformTenantId, userId: testUserId },
    });
    expect(memberships).toHaveLength(1);
  });

  it("throws for an identity that does not exist, without creating anything", async () => {
    const unknownEmail = `no-such-identity-${randomUUID()}@example.com`;

    await expect(bootstrapOperator(admin, unknownEmail)).rejects.toThrow(
      /no existing identity/,
    );

    const membership = await admin.$queryRaw<{ id: string }[]>`
      SELECT tm.id FROM tenant_membership tm
      JOIN "user" u ON u.id = tm.user_id
      JOIN party p ON p.id = u.party_id
      WHERE lower(p.email) = lower(${unknownEmail})`;
    expect(membership).toHaveLength(0);
  });

  it("does not disturb the shared 'Verity Operator' role's existing grant shape", async () => {
    // Confirms this test's runs left the role's OWN grant exactly as found —
    // OPERATOR_ENTITY is granted, and only once, regardless of how many
    // identities have been bootstrapped against it.
    const role = await admin.role.findFirst({
      where: { tenantId: platformTenantId, name: OPERATOR_ROLE_NAME },
      select: { id: true },
    });
    expect(role).not.toBeNull();

    const grants = await admin.permission.findMany({
      where: {
        tenantId: platformTenantId,
        roleId: role!.id,
        verb: "ActionExecute",
        entity: OPERATOR_ENTITY,
      },
    });
    expect(grants).toHaveLength(1);
  });
});
