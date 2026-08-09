// Gives every producible group a starter recipe, so items created from it come
// out with a bill of materials rather than an empty one.
//
// A group with an item-reference field (e.g. Fabric) gets a line driven by that
// field, so the BOM follows whatever the owner picked. Every group also gets
// fixed thread and packaging lines.
//
// Idempotent: a group that already has BOM lines is left alone.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
if (!factory) { console.error("No Carxen factory."); process.exit(1); }
const factoryId = factory.id;

const thread = await prisma.itemMaster.findFirst({ where: { factoryId, name: { contains: "Thread" } } });
const bag = await prisma.itemMaster.findFirst({ where: { factoryId, itemType: "PACKAGING" } });
const foam = await prisma.itemMaster.findFirst({ where: { factoryId, name: { contains: "Foam" } } });

const groups = await prisma.itemGroup.findMany({
  where: { factoryId, itemType: { in: ["FINISHED_PRODUCT", "SEMI_FINISHED"] }, parentId: { not: null } },
  select: { id: true, name: true },
});

for (const g of groups) {
  const existing = await prisma.bomTemplateLine.count({ where: { groupId: g.id } });
  if (existing > 0) { console.log(`= ${g.name}: ${existing} line(s) already`); continue; }

  const lines = [];

  // Prefer a material driven by the item's own answer — but only a field
  // pointing at something the factory actually stocks. The first reference on a
  // seat cover is the vehicle it fits, and taking that put a car in the recipe.
  const refField = await prisma.specField.findFirst({
    where: {
      factoryId,
      groupId: g.id,
      kind: "REFERENCE",
      refTarget: "ITEM_GROUP",
      archivedAt: null,
      targetGroup: { hasInventoryUnits: true },
    },
    orderBy: { sortOrder: "asc" },
  });
  if (refField) lines.push({ sourceFieldId: refField.id, quantity: 3.2, wastePercent: 8 });
  else if (foam) lines.push({ itemId: foam.id, quantity: 2, wastePercent: 5 });

  if (thread) lines.push({ itemId: thread.id, quantity: 1, wastePercent: 0 });
  if (bag) lines.push({ itemId: bag.id, quantity: 1, wastePercent: 0 });

  for (const [i, l] of lines.entries()) {
    await prisma.bomTemplateLine.create({ data: { factoryId, groupId: g.id, sortOrder: i, ...l } });
  }
  console.log(`+ ${g.name}: ${lines.length} line(s)${refField ? ` (via ${refField.name})` : ""}`);
}
await prisma.$disconnect();
