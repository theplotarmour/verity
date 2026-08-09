// Gives every existing category the BOM mode it was already behaving as.
//
// bomMode defaults to OFF, so without this every category would silently lose
// the editor it has today. The rules below are the inference the code used to
// make, written down once:
//
//   RECIPE       producible, stocked — it has an assembly recipe of its own
//   INGREDIENTS  an attribute (units off), or a category some spec column
//                points at — either way, things pick it and inherit from it
//   OFF          neither: bought and consumed, nothing references it
//
// Idempotent, and it never overwrites a category an owner has already set.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const groups = await prisma.itemGroup.findMany({
  select: {
    id: true,
    name: true,
    factoryId: true,
    isProducible: true,
    hasInventoryUnits: true,
    bomMode: true,
  },
  orderBy: { name: "asc" },
});

let set = 0;
for (const g of groups) {
  // Someone has already chosen for this one.
  if (g.bomMode !== "OFF") continue;

  const referenced =
    (await prisma.specField.count({
      where: { kind: "REFERENCE", targetGroupId: g.id, archivedAt: null },
    })) > 0;

  const mode =
    g.isProducible && g.hasInventoryUnits
      ? "RECIPE"
      : !g.hasInventoryUnits || referenced
        ? "INGREDIENTS"
        : "OFF";

  if (mode === "OFF") continue;
  await prisma.itemGroup.update({ where: { id: g.id }, data: { bomMode: mode } });
  console.log(`  ${g.name} -> ${mode}`);
  set += 1;
}

console.log(`${set} of ${groups.length} categories given a mode; the rest stay OFF.`);
await prisma.$disconnect();
