import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
const strays = await p.itemGroup.findMany({
  where: { factoryId: f!.id, name: { startsWith: "ZZ Test" } },
  include: { _count: { select: { items: true, children: true } } },
});
// Children first, so a parent is never blocked by its own leftovers.
for (const g of strays.sort((a, b) => b._count.children - a._count.children).reverse()) {
  if (g._count.items > 0) { console.log(`KEPT ${g.name} — has items`); continue; }
  await p.itemGroup.delete({ where: { id: g.id } });
  console.log(`removed scratch category ${g.name}`);
}
console.log("remaining ZZ Test groups:", await p.itemGroup.count({ where: { factoryId: f!.id, name: { startsWith: "ZZ Test" } } }));
await p.$disconnect();
