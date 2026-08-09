// Idempotent: creates the six root item groups for every factory that lacks
// them. Safe to run against a populated database — it never deletes or updates,
// so it is the non-destructive alternative to `npm run db:reset`.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// bomMode is stated rather than left to the default. It defaults to OFF, so a
// root seeded without one comes out with no BOM editor at all and no hint as to
// why — the owner can turn it on in Configure, but only if they know to look.
//
// A finished or semi-finished good is assembled, so it gets a recipe. Everything
// else here is bought and consumed: raw material, consumables, packaging and
// trading goods have no recipe of their own. A category that other items *pick*
// — a fabric, a design — wants INGREDIENTS, but those are subcategories the
// owner creates, not roots, so none of them appear in this list.
const ROOT_GROUPS = [
  { name: "Raw Material", itemType: "RAW_MATERIAL", shortCode: "RM", bomMode: "OFF" },
  { name: "Semi-Finished", itemType: "SEMI_FINISHED", shortCode: "SF", bomMode: "RECIPE" },
  { name: "Finished Good", itemType: "FINISHED_PRODUCT", shortCode: "FG", bomMode: "RECIPE" },
  { name: "Consumable", itemType: "CONSUMABLE", shortCode: "CN", bomMode: "OFF" },
  { name: "Packaging", itemType: "PACKAGING", shortCode: "PK", bomMode: "OFF" },
  { name: "Trading Goods", itemType: "SPARE_PART", shortCode: "TG", bomMode: "OFF" },
];

const factories = await prisma.factory.findMany({ select: { id: true, name: true } });

for (const factory of factories) {
  for (const [i, g] of ROOT_GROUPS.entries()) {
    const existing = await prisma.itemGroup.findFirst({
      where: { factoryId: factory.id, parentId: null, name: g.name },
      select: { id: true },
    });
    if (existing) {
      console.log(`= ${factory.name}: ${g.name} already present`);
      continue;
    }
    await prisma.itemGroup.create({
      data: { ...g, factoryId: factory.id, isSheet: true, sortOrder: i },
    });
    console.log(`+ ${factory.name}: ${g.name}`);
  }
}

await prisma.$disconnect();
