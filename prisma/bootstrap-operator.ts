/**
 * Creates the Verity platform tenant and grants one person operator authority.
 *
 * Authority: ADR-013 (identity Shape 1) and work plan D15–D21.
 *
 * Idempotent, and deliberately not part of `seed.ts`: seeding builds sample
 * client data, while this establishes the platform's own tenant. Conflating the
 * two is how a demo record ends up carrying real authority.
 *
 *   npx tsx prisma/bootstrap-operator.ts <email>
 *
 * The email identifies an EXISTING authenticated user — the person must already
 * be able to sign in. This grants authority; it does not create credentials,
 * because credential creation belongs to Supabase Auth and nowhere else.
 */
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

/**
 * Connects as the MIGRATION role, not the runtime role.
 *
 * Deliberate, and the one place it is correct. This script provisions the
 * platform tenant itself: there is no tenant scope to run it under, and the
 * identity lookup crosses tenancy by nature. That makes it the same class of
 * work as a migration — operational provisioning, run by a human, never on a
 * request path. CLAUDE.md forbids the bypassing role from carrying APPLICATION
 * traffic; this is not application traffic.
 */
const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const PLATFORM_TENANT_NAME = "Verity Platform";
const OPERATOR_ROLE_NAME = "Verity Operator";
const OPERATOR_ENTITY = "verity.platform.operator";

async function withTenant<T>(tenantId: string, fn: (tx: any) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('verity.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("usage: tsx prisma/bootstrap-operator.ts <email>");

  // The platform tenant is found by its marker, never by name — the marker is
  // the fact, the name is a label. Read through the same definer function the
  // application uses for the bootstrap case, because `tenant` is RLS-protected
  // and no scope exists yet.
  const [existing] = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM tenant WHERE is_platform LIMIT 1`;

  let tenantId = existing?.id;
  let organizationId: string;

  if (tenantId) {
    console.log(`platform tenant already present: ${tenantId}`);
    organizationId = await withTenant(tenantId, async (tx: any) => {
      const org = await tx.organization.findFirst({
        where: { tenantId, parentId: null },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (!org) throw new Error("platform tenant has no root organization");
      return org.id;
    });
  } else {
    // Setting the scope to the id being created is what lets the INSERT satisfy
    // the tenant policy's WITH CHECK without any role that bypasses RLS.
    tenantId = randomUUID();
    organizationId = await withTenant(tenantId, async (tx: any) => {
      await tx.tenant.create({
        data: { id: tenantId, name: PLATFORM_TENANT_NAME, isPlatform: true },
      });
      const org = await tx.organization.create({
        data: { tenantId, name: PLATFORM_TENANT_NAME, parentId: null },
        select: { id: true },
      });
      return org.id;
    });
    console.log(`created platform tenant ${tenantId}`);
  }

  // The person. Looked up, never created: ADR-007 is explicit that identity is
  // linked through verification, so inventing a Party here would be exactly the
  // de-duplication guess it forbids. Matches either the Party's own recorded
  // email or the Supabase auth address, because those are the two places the
  // same person's address legitimately lives.
  const [user] = await prisma.$queryRaw<{ user_id: string }[]>`
    SELECT u.id AS user_id
    FROM "user" u
    JOIN party p ON p.id = u.party_id
    LEFT JOIN auth.users au ON au.id = u.auth_user_id
    WHERE lower(p.email) = lower(${email}) OR lower(au.email) = lower(${email})
    LIMIT 1`;

  if (!user) {
    throw new Error(
      `no existing identity for ${email}. The person must be able to sign in first; ` +
        `this script grants authority, it does not create credentials.`,
    );
  }

  await withTenant(tenantId, async (tx: any) => {
    let role = await tx.role.findFirst({
      where: { tenantId, name: OPERATOR_ROLE_NAME },
      select: { id: true },
    });
    if (!role) {
      role = await tx.role.create({
        data: { tenantId, name: OPERATOR_ROLE_NAME },
        select: { id: true },
      });
      console.log(`created role ${OPERATOR_ROLE_NAME}`);
    }

    const grant = await tx.permission.findFirst({
      where: { tenantId, roleId: role.id, verb: "ActionExecute", entity: OPERATOR_ENTITY },
      select: { id: true },
    });
    if (!grant) {
      await tx.permission.create({
        data: {
          tenantId,
          roleId: role.id,
          verb: "ActionExecute",
          entity: OPERATOR_ENTITY,
          scope: "Tenant",
        },
      });
      console.log(`granted ActionExecute ${OPERATOR_ENTITY}`);
    }

    const membership = await tx.tenantMembership.findFirst({
      where: { tenantId, userId: user.user_id },
      select: { id: true, roleId: true },
    });

    if (!membership) {
      await tx.tenantMembership.create({
        data: { tenantId, userId: user.user_id, organizationId, roleId: role.id },
      });
      console.log(`granted operator membership to ${email}`);
    } else if (membership.roleId !== role.id) {
      await tx.tenantMembership.update({
        where: { id: membership.id },
        data: { roleId: role.id },
      });
      console.log(`updated operator role for ${email}`);
    } else {
      console.log(`${email} is already an operator`);
    }
  });

  console.log("bootstrap complete");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
