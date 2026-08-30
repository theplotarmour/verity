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
 *   npm run bootstrap:operator -- <email>
 *
 * The email identifies an EXISTING authenticated user — the person must already
 * be able to sign in. This grants authority; it does not create credentials,
 * because credential creation belongs to the active auth provider and nowhere
 * else (Task 28's `AuthProvider` boundary — Supabase Auth today).
 *
 * The actual logic lives in `operator-bootstrap-core.ts` (Task 31), extracted
 * so it can be exercised directly by tests without shelling out to this CLI.
 * This file is the thin wrapper: argv parsing, the privileged connection, and
 * reporting the result as the same log lines this script always printed.
 */
import { PrismaClient } from "@prisma/client";
import { bootstrapOperator } from "./operator-bootstrap-core";

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

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("usage: tsx prisma/bootstrap-operator.ts <email>");

  const result = await bootstrapOperator(prisma, email);

  if (result.platformTenantCreated) {
    console.log(`created platform tenant ${result.tenantId}`);
  } else {
    console.log(`platform tenant already present: ${result.tenantId}`);
  }
  if (result.roleCreated) console.log(`created role Verity Operator`);
  if (result.grantCreated) console.log(`granted ActionExecute verity.platform.operator`);

  switch (result.membershipOutcome) {
    case "created":
      console.log(`granted operator membership to ${email}`);
      break;
    case "role_updated":
      console.log(`updated operator role for ${email}`);
      break;
    case "already_operator":
      console.log(`${email} is already an operator`);
      break;
  }

  console.log("bootstrap complete");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
