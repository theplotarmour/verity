/**
 * Provision a prospect's trial workspace from the command line.
 *
 * The HQ console does this through a session; this exists for the case where
 * there isn't one yet — standing up a demo before the first meeting.
 *
 * Idempotent by slug: re-running reports the existing workspace rather than
 * creating a second one.
 *
 *   npx tsx scripts/provision-trial.ts asian-security          # report only
 *   npx tsx scripts/provision-trial.ts asian-security --apply  # write
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

import { provisionCore } from "../src/platform/tenancy/provision-core";
import type { ModuleKey } from "../src/platform/modules/registry";

const prisma = new PrismaClient();

const hashPin = (pin: string, factoryId: string) =>
  createHash("sha256").update(`verity:${factoryId}:${pin}`).digest("hex");

interface Trial {
  name: string;
  slug: string;
  industry: string;
  modules: ModuleKey[];
  owner: { name: string; phone: string };
  /** Seeded so a demo shows a populated system rather than empty tables. */
  sites: { name: string; city: string; slaHours: number }[];
  shifts: { name: string; startTime: string; endTime: string }[];
}

const TRIALS: Record<string, Trial> = {
  "asian-security": {
    name: "Asian Security & Intelligence Ltd",
    slug: "asian-security",
    industry: "Security Services",
    // They run guarding, housekeeping, electronic security and contract labour
    // off one workforce, so this is broader than the security_services pack:
    // quality and procurement for housekeeping, assets for the electronic
    // security estate, crm/sales for the outsourcing side.
    modules: [
      "core", "hr", "sites", "scheduling", "helpdesk",
      "assets", "quality", "procurement", "crm", "sales", "billing",
    ],
    owner: { name: "Asian Security Admin", phone: "9891332222" },
    // Named on their own site as clients — a demo that shows the prospect their
    // own account list lands very differently from "Site A / Site B".
    sites: [
      { name: "Carlsberg India", city: "Gurugram", slaHours: 4 },
      { name: "Havells India", city: "Noida", slaHours: 8 },
      { name: "Delhi Public School", city: "Noida", slaHours: 12 },
      { name: "Amity University", city: "Noida", slaHours: 8 },
      { name: "Head Office — A-17 Sector 35", city: "Noida", slaHours: 24 },
    ],
    shifts: [
      { name: "Morning", startTime: "06:00", endTime: "14:00" },
      { name: "Evening", startTime: "14:00", endTime: "22:00" },
      { name: "Night", startTime: "22:00", endTime: "06:00" },
    ],
  },
  "kents": {
    name: "Kent's Kitchen",
    slug: "kents",
    industry: "Restaurant OS",
    modules: [
      "core", "hr", "menu", "tables_orders", "kitchen", "serving", "billing"
    ],
    owner: { name: "Kent Jones", phone: "8800000008" },
    sites: [],
    shifts: [],
  },
};

async function main() {
  const key = process.argv[2];
  const apply = process.argv.includes("--apply");
  const trial = key ? TRIALS[key] : undefined;

  if (!trial) {
    console.log("Usage: npx tsx scripts/provision-trial.ts <key> [--apply]");
    console.log("Known keys:", Object.keys(TRIALS).join(", "));
    return;
  }

  const existing = await prisma.factory.findUnique({
    where: { slug: trial.slug },
    select: { id: true, name: true },
  });
  if (existing) {
    console.log(`Already provisioned: ${existing.name} (${existing.id}).`);
    console.log("Manage it at /verity/clients — this script will not touch it.");
    return;
  }

  if (!apply) {
    console.log(`[dry-run] would create ${trial.name} (/${trial.slug})`);
    console.log(`  modules: ${trial.modules.join(", ")}`);
    console.log(`  owner:   ${trial.owner.name} (${trial.owner.phone}) — PIN generated on apply`);
    console.log(`  sites:   ${trial.sites.map((s) => s.name).join(", ")}`);
    console.log(`  shifts:  ${trial.shifts.map((s) => s.name).join(", ")}`);
    console.log("\nRe-run with --apply to create it.");
    return;
  }

  const clash = await prisma.user.findUnique({
    where: { phone: trial.owner.phone },
    select: { id: true },
  });

  const pin = key === "kents" ? "1234" : String(Math.floor(1000 + Math.random() * 9000));

  const result = await prisma.$transaction(async (tx) => {
    const core = await provisionCore(tx, {
      name: trial.name,
      slug: trial.slug,
      industry: trial.industry,
      onboardingStatus: "SETUP",
      modules: trial.modules,
    });

    // Phone is the platform-wide username, so a collision means this prospect
    // shares a number with an existing account. Create the workspace anyway and
    // let a human sort the login out rather than failing the whole trial.
    if (!clash) {
      await tx.user.create({
        data: {
          factoryId: core.factoryId,
          name: trial.owner.name,
          phone: trial.owner.phone,
          role: "OWNER",
          roleId: core.roleIdByArchetype.OWNER,
          pinHash: hashPin(pin, core.factoryId),
          isActive: true,
        },
      });
    }

    await tx.shift.createMany({
      data: trial.shifts.map((s) => ({ ...s, factoryId: core.factoryId })),
    });

    let n = 1;
    for (const site of trial.sites) {
      await tx.site.create({
        data: {
          factoryId: core.factoryId,
          siteCode: `SITE-${String(n++).padStart(4, "0")}`,
          name: site.name,
          city: site.city,
          state: "Uttar Pradesh",
          slaHours: site.slaHours,
          status: "ACTIVE",
        },
      });
    }

    return core;
  });

  console.log(`Created ${trial.name}`);
  console.log(`  factory:      ${result.factoryId}`);
  console.log(`  organisation: ${result.organizationId}`);
  console.log(`  modules:      ${result.modules.length} (${result.modules.join(", ")})`);
  console.log(`  sites:        ${trial.sites.length}`);
  console.log(`  shifts:       ${trial.shifts.length}`);
  if (clash) {
    console.log(`  owner:        NOT created — ${trial.owner.phone} already belongs to another account`);
  } else {
    console.log(`  owner login:  ${trial.owner.phone} / PIN ${pin}   (shown once)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
