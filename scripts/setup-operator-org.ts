/**
 * Give the operator their own workspace.
 *
 * The HQ operator was seeded as a user *inside Carxen* — a client's workspace —
 * which is the wrong shape twice over: the person who administers the platform
 * is not an employee of a customer, and a client workspace losing its owner to
 * a rename leaves that tenant without one.
 *
 * PlotArmour is the vendor and gets its own organisation. Divyom Sharma owns it
 * and is the HQ operator. Carxen keeps its own owner, as a client should.
 *
 * Idempotent: safe to re-run, and it never overwrites a workspace it did not
 * create.
 *
 *   npx tsx scripts/setup-operator-org.ts          # report only
 *   npx tsx scripts/setup-operator-org.ts --apply  # write
 */

import { PrismaClient, type SystemRole } from "@prisma/client";
import { createHash } from "node:crypto";

import { allModules, withDependencies, type ModuleKey } from "../src/platform/modules/registry";
import { DEFAULT_GRANTS } from "../src/platform/tenancy/default-grants";

const prisma = new PrismaClient();

// Must match src/lib/server/hash.ts exactly.
const hashPin = (pin: string, factoryId: string) =>
  createHash("sha256").update(`verity:${factoryId}:${pin}`).digest("hex");

const OPERATOR = {
  orgName: "PlotArmour",
  slug: "plotarmour",
  personName: "Divyom Sharma",
  phone: "7011440350",
  pin: "1803",
  // The vendor runs a services business of its own.
  modules: ["core", "hr", "projects", "crm", "sales", "billing"] as ModuleKey[],
};

// Carxen is a demo client and needs to keep an owner of its own.
const CLIENT_OWNER = { name: "Yashu Malik", phone: "9971907190", pin: "7190" };

const ROLE_LABELS: Record<SystemRole, string> = {
  OWNER: "Owner",
  CO_OWNER: "Co-Owner",
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  WORKER: "Worker",
  STORE_MANAGER: "Store Manager",
};

async function main() {
  const apply = process.argv.includes("--apply");
  const say = (s: string) => console.log(`${apply ? "" : "[dry-run] "}${s}`);

  // --- 1. The operator's own organisation -----------------------------------
  let factory = await prisma.factory.findUnique({
    where: { slug: OPERATOR.slug },
    select: { id: true, organizationId: true },
  });

  if (factory) {
    say(`PlotArmour workspace already exists (${factory.id}).`);
  } else if (!apply) {
    say(`would create organisation + factory "${OPERATOR.orgName}" (/${OPERATOR.slug})`);
  } else {
    const modules = withDependencies(OPERATOR.modules);
    const entitled = new Set<string>(modules);
    const owningModule = new Map<string, string>();
    for (const mod of allModules()) {
      for (const perm of mod.permissions) owningModule.set(perm.key, mod.key);
    }

    const org = await prisma.organization.create({
      data: { name: OPERATOR.orgName, slug: OPERATOR.slug },
    });
    const created = await prisma.factory.create({
      data: {
        organizationId: org.id,
        name: OPERATOR.orgName,
        slug: OPERATOR.slug,
        industry: "Software",
        onboardingStatus: "LIVE",
      },
    });
    await prisma.moduleEntitlement.createMany({
      data: modules.map((moduleKey) => ({ organizationId: org.id, moduleKey, enabled: true })),
      skipDuplicates: true,
    });
    for (const archetype of Object.keys(DEFAULT_GRANTS) as SystemRole[]) {
      const grants = DEFAULT_GRANTS[archetype].filter((key) => {
        const owner = owningModule.get(key);
        return owner !== undefined && entitled.has(owner);
      });
      await prisma.role.create({
        data: {
          organizationId: org.id,
          name: ROLE_LABELS[archetype],
          description: "Built-in role. Rename or copy it; it cannot be deleted.",
          systemRole: archetype,
          isSystem: true,
          permissions: { create: grants.map((key) => ({ key })) },
        },
      });
    }
    factory = { id: created.id, organizationId: org.id };
    say(`created PlotArmour workspace (${created.id}) with ${modules.length} modules`);
  }

  // --- 2. The operator account ----------------------------------------------
  const holder = await prisma.user.findUnique({
    where: { phone: OPERATOR.phone },
    select: { id: true, name: true, factoryId: true },
  });

  if (!factory) {
    say("cannot place the operator until the workspace exists — re-run with --apply");
  } else if (holder && holder.factoryId === factory.id) {
    say(`${OPERATOR.personName} already owns PlotArmour; refreshing name and PIN`);
    if (apply) {
      await prisma.user.update({
        where: { id: holder.id },
        data: {
          name: OPERATOR.personName,
          pinHash: hashPin(OPERATOR.pin, factory.id),
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
    }
  } else if (holder) {
    // The number is currently on someone inside a client workspace — that is
    // exactly the situation this script exists to undo. Free it, restore that
    // tenant's own owner, then place the operator.
    say(`${OPERATOR.phone} is currently "${holder.name}" in factory ${holder.factoryId}`);
    say(`  -> restoring that account to ${CLIENT_OWNER.name} / ${CLIENT_OWNER.phone}`);
    say(`  -> creating ${OPERATOR.personName} in PlotArmour`);
    if (apply) {
      await prisma.user.update({
        where: { id: holder.id },
        data: {
          name: CLIENT_OWNER.name,
          phone: CLIENT_OWNER.phone,
          pinHash: hashPin(CLIENT_OWNER.pin, holder.factoryId),
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
    }
  }

  if (apply && factory) {
    const already = await prisma.user.findUnique({ where: { phone: OPERATOR.phone } });
    if (!already) {
      const ownerRole = await prisma.role.findFirst({
        where: { organizationId: factory.organizationId, systemRole: "OWNER", isSystem: true },
        select: { id: true },
      });
      await prisma.user.create({
        data: {
          factoryId: factory.id,
          name: OPERATOR.personName,
          phone: OPERATOR.phone,
          role: "OWNER",
          roleId: ownerRole?.id ?? null,
          pinHash: hashPin(OPERATOR.pin, factory.id),
          isActive: true,
        },
      });
      say(`created ${OPERATOR.personName} (${OPERATOR.phone}) as OWNER of PlotArmour`);
    }
  }

  // --- 3. Report -------------------------------------------------------------
  const users = await prisma.user.findMany({
    where: { role: { in: ["OWNER", "CO_OWNER"] } },
    select: { name: true, phone: true, role: true, factory: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  console.log("\nOwners now:");
  for (const u of users) {
    console.log(`  ${String(u.phone).padEnd(12)} ${u.role.padEnd(9)} ${u.name} — ${u.factory.name}`);
  }
  console.log(`\nVERITY_HQ_PHONES should be: ${OPERATOR.phone}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
