// Attaches the default QC template and production route to the producible item
// groups, so every item created from them inherits both.
//
// Idempotent. Run with: node scripts/seed_group_defaults.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
if (!factory) {
  console.error("No Carxen factory.");
  process.exit(1);
}
const factoryId = factory.id;

const departments = await prisma.department.findMany({
  where: { factoryId, active: true },
  orderBy: { sortOrder: "asc" },
  select: { id: true, name: true },
});
const byName = new Map(departments.map((d) => [d.name, d]));

// The Carxen chain. Missing departments are skipped rather than guessed at.
const CHAIN = [
  ["CAD", 30],
  ["Cutting", 45],
  ["Stitching", 120],
  ["Quality Check", 20],
  ["Packing", 15],
];

const route = CHAIN.filter(([name]) => byName.has(name)).map(([name, mins]) => ({
  departmentId: byName.get(name).id,
  estimatedTimeMins: mins,
}));

if (route.length !== CHAIN.length) {
  const missing = CHAIN.filter(([n]) => !byName.has(n)).map(([n]) => n);
  console.log(`! departments not found, skipped: ${missing.join(", ")}`);
}

const qc = await prisma.checklistTemplate.findFirst({
  where: { factoryId, status: "active", name: { contains: "Seat Cover" } },
});
const fallbackQc = await prisma.checklistTemplate.findFirst({
  where: { factoryId, status: "active" },
});
const qcTemplate = qc ?? fallbackQc;

// Producible groups: everything under Finished Good and Semi-Finished.
const roots = await prisma.itemGroup.findMany({
  where: { factoryId, parentId: null, itemType: { in: ["FINISHED_PRODUCT", "SEMI_FINISHED"] } },
  select: { id: true, name: true },
});
const groups = await prisma.itemGroup.findMany({
  where: { factoryId, OR: [{ id: { in: roots.map((r) => r.id) } }, { parentId: { in: roots.map((r) => r.id) } }] },
  select: { id: true, name: true },
});

for (const g of groups) {
  await prisma.itemGroup.update({
    where: { id: g.id },
    data: {
      defaultRouteJson: route,
      // A category runs one checklist per department, so this connects rather
      // than overwrites — setting the QC one must not unmap Cutting's.
      ...(qcTemplate ? { defaultChecklists: { connect: { id: qcTemplate.id } } } : {}),
      isProducible: true,
      hasBOM: true,
      hasQC: Boolean(qcTemplate),
      hasRouting: route.length > 0,
    },
  });
  console.log(`= ${g.name}: ${route.length} route steps, QC ${qcTemplate?.name ?? "none"}`);
}

await prisma.$disconnect();
