import { PrismaClient, type SystemRole } from "@prisma/client";

import { ROLE_REGISTRY_GRANTS } from "../src/platform/rbac/legacy-backfill";

/**
 * Phase 4 backfill: grant every role the registry permissions that express what
 * it can already reach through the legacy union.
 *
 *   npx tsx scripts/backfill-role-permissions.ts            # dry run, writes nothing
 *   npx tsx scripts/backfill-role-permissions.ts --apply    # writes
 *
 * Dry run is the default on purpose. This touches permissions on live tenants,
 * and the failure mode of the opposite default is silent privilege change.
 *
 * Role-driven, never org-driven: it iterates whatever organisations exist and
 * applies one matrix to all of them. No org ids, no tenant-specific branches, no
 * knowledge of departments, people or team structure. `SystemRole` values are
 * schema constants, not tenant data, so naming them is fine.
 *
 * Additive via `skipDuplicates`, so re-running is a no-op and a tenant's
 * hand-added grants are never removed.
 */

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      systemRole: true,
      organizationId: true,
      permissions: { select: { key: true } },
    },
    orderBy: { organizationId: "asc" },
  });

  const orgIds = [...new Set(roles.map((r) => r.organizationId))];
  const perOrg = new Map<string, number>();
  const perRole = new Map<string, { roles: number; adds: number }>();
  const pending: Array<{ roleId: string; key: string }> = [];

  for (const role of roles) {
    const held = new Set(role.permissions.map((p) => p.key));
    const want = ROLE_REGISTRY_GRANTS[role.systemRole as SystemRole] ?? [];
    const add = want.filter((key) => !held.has(key));

    for (const key of add) pending.push({ roleId: role.id, key });

    perOrg.set(role.organizationId, (perOrg.get(role.organizationId) ?? 0) + add.length);
    const bucket = perRole.get(role.systemRole) ?? { roles: 0, adds: 0 };
    bucket.roles += 1;
    bucket.adds += add.length;
    perRole.set(role.systemRole, bucket);
  }

  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — ${roles.length} roles across ${orgIds.length} organisations`);
  console.log(`rows to insert: ${pending.length}\n`);

  console.log("per role:");
  for (const [role, v] of [...perRole].sort()) {
    console.log(`  ${role.padEnd(14)} roles=${v.roles}  adds=${String(v.adds).padStart(4)}`);
  }

  console.log("\nper organisation:");
  // Organisation ids only — a migration has no reason to read tenant names.
  for (const [orgId, count] of [...perOrg].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${orgId.padEnd(28)} ${String(count).padStart(4)}`);
  }

  if (!APPLY) {
    console.log("\nNothing written. Re-run with --apply to write.");
    return;
  }

  const result = await prisma.rolePermission.createMany({
    data: pending,
    skipDuplicates: true,
  });
  console.log(`\ninserted ${result.count} rows (skipDuplicates on, so re-runs are inert)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
