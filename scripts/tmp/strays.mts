import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
const fid = f!.id;
const strays = await p.design.findMany({ where: { factoryId: fid, fabricConsumption: null }, select: { id: true, name: true } });
for (const s of strays) {
  const used = (await p.itemFieldValue.count({ where: { valueRefId: s.id } })) + (await p.salesOrder.count({ where: { designId: s.id } }));
  if (used > 0) { console.log(`KEPT "${s.name}" — ${used} reference(s)`); continue; }
  await p.bomContribution.deleteMany({ where: { refId: s.id } });
  await p.design.delete({ where: { id: s.id } });
  console.log(`REMOVED incomplete design "${s.name}"`);
}
console.log("designs:", await p.design.count({ where: { factoryId: fid } }), "contributions:", await p.bomContribution.count({ where: { factoryId: fid } }));
await p.$disconnect();
