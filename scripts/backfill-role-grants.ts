/**
 * Backfill the service-module permission grants onto existing system roles.
 *
 * `DEFAULT_GRANTS` gained the sites/helpdesk/projects/assets/scheduling/billing
 * keys when those modules were added. Tenants provisioned before that keep the
 * grants they were created with, so their Owner role has no `site.view` and the
 * nav would hide Sites from the person who administers it. The shell currently
 * papers over this by letting owners, co-owners and managers through without
 * the key; running this removes the need for that carve-out.
 *
 * Safe to re-run. Purely additive — it never removes a grant, never touches a
 * custom (non-system) role, and only grants keys whose module the organisation
 * is actually entitled to.
 *
 *   npx tsx scripts/backfill-role-grants.ts          # report only
 *   npx tsx scripts/backfill-role-grants.ts --apply  # write
 */

import type { SystemRole } from "@prisma/client";

import { PrismaClient } from "@prisma/client";

import { getModule, moduleForPermission, withDependencies } from "../src/platform/modules/registry";
import type { ModuleKey } from "../src/platform/modules/registry";
import { DEFAULT_GRANTS } from "../src/platform/tenancy/default-grants";

// A local client and a local entitlement read: the app's helpers are
// `server-only`, which throws the moment this runs outside Next.
const prisma = new PrismaClient();

async function entitledModules(organizationId: string): Promise<ModuleKey[]> {
  const rows = await prisma.moduleEntitlement.findMany({
    where: {
      organizationId,
      enabled: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { moduleKey: true },
  });
  return withDependencies(
    rows.map((r) => r.moduleKey as ModuleKey).filter((k) => getModule(k) !== undefined),
  );
}

async function main() {
  const apply = process.argv.includes("--apply");

  const roles = await prisma.role.findMany({
    where: { isSystem: true },
    select: {
      id: true,
      name: true,
      systemRole: true,
      organizationId: true,
      permissions: { select: { key: true } },
    },
  });

  const entitlementCache = new Map<string, Set<string>>();
  let totalMissing = 0;

  for (const role of roles) {
    let entitled = entitlementCache.get(role.organizationId);
    if (!entitled) {
      entitled = new Set<string>(await entitledModules(role.organizationId));
      entitlementCache.set(role.organizationId, entitled);
    }

    const held = new Set(role.permissions.map((p) => p.key));
    const expected = DEFAULT_GRANTS[role.systemRole as SystemRole] ?? [];

    const missing = expected.filter((key) => {
      if (held.has(key)) return false;
      const owner = moduleForPermission(key);
      return owner !== undefined && entitled!.has(owner.key);
    });

    if (missing.length === 0) continue;
    totalMissing += missing.length;

    console.log(
      `${apply ? "grant" : "would grant"} ${role.organizationId} / ${role.name}: ${missing.join(", ")}`,
    );

    if (apply) {
      await prisma.rolePermission.createMany({
        data: missing.map((key) => ({ roleId: role.id, key })),
        skipDuplicates: true,
      });
    }
  }

  console.log(
    totalMissing === 0
      ? "Nothing to backfill — every system role already holds its entitled grants."
      : `${totalMissing} grant(s) ${apply ? "written" : "pending; re-run with --apply"}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
