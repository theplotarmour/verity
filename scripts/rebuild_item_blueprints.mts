// Rebuilds the active blueprint for every producible item, so items created
// before their group had a route, a checklist or a recipe pick them up.
//
// A version nothing is produced against is replaced outright. A version that
// already has production plans or order lines against it is retired instead —
// deactivated, kept, and superseded by a new one — because deleting it would
// orphan the work booked against it. Either way the item ends up with a current
// active version, which is what everything downstream reads.
import { PrismaClient } from "@prisma/client";
import { buildItemBlueprint } from "../src/server/actions/itemBlueprint";

const prisma = new PrismaClient();
const f = await prisma.factory.findFirstOrThrow({ where: { slug: "carxen" } });

const stale = await prisma.blueprint.findMany({
  where: { factoryId: f.id, versions: { none: { bom: { isNot: null } } } },
  select: { id: true, itemId: true },
});
console.log(`${stale.length} blueprint(s) without a BOM`);

for (const b of stale) {
  await prisma.blueprint.update({ where: { id: b.id }, data: { activeVersionId: null } });

  const versions = await prisma.blueprintVersion.findMany({
    where: { blueprintId: b.id },
    select: { id: true, _count: { select: { productionPlans: true, salesOrderItems: true } } },
  });
  let retired = 0;
  for (const v of versions) {
    if (v._count.productionPlans === 0 && v._count.salesOrderItems === 0) {
      await prisma.blueprintVersion.delete({ where: { id: v.id } });
    } else {
      // Deactivate rather than delete. Leaving it active made buildItemBlueprint
      // return the old empty version and this script report success while
      // changing nothing at all.
      await prisma.blueprintVersion.update({ where: { id: v.id }, data: { isActive: false } });
      retired += 1;
    }
  }

  const { blueprintVersionId, warnings } = await buildItemBlueprint(f.id, b.itemId);
  const item = await prisma.itemMaster.findUniqueOrThrow({
    where: { id: b.itemId },
    select: { name: true },
  });
  const note = [
    retired ? `${retired} in-use version(s) retired` : null,
    ...warnings,
  ].filter(Boolean);
  const mark = !blueprintVersionId ? "!" : warnings.length ? "⚠" : "+";
  console.log(`  ${mark} ${item.name}${note.length ? ` — ${note.join("; ")}` : ""}`);
}
await prisma.$disconnect();
