// Gives every producible spec-created item its blueprint, QC template, route
// and BOM, using the same code path the Add Master Data wizard runs.
//
// Idempotent: an item that already has an active blueprint version is skipped.
import { PrismaClient } from "@prisma/client";
import { buildItemBlueprint } from "../src/server/actions/itemBlueprint";

const prisma = new PrismaClient();
const factories = await prisma.factory.findMany({ select: { id: true, name: true } });

for (const f of factories) {
  const items = await prisma.itemMaster.findMany({
    where: { factoryId: f.id, manufacturingType: { in: ["MAKE", "BOTH"] }, groupId: { not: null } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  console.log(`${f.name}: ${items.length} producible item(s)`);
  for (const it of items) {
    const { blueprintVersionId, warnings } = await buildItemBlueprint(f.id, it.id);
    const tag = blueprintVersionId ? "+" : "·";
    console.log(`  ${tag} ${it.name}${warnings.length ? "  ⚠ " + warnings.join("; ") : ""}`);
  }
}
await prisma.$disconnect();
