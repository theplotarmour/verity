import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
console.log({
  items: await p.itemMaster.count({ where: { factoryId: f!.id } }),
  fg: await p.itemMaster.count({ where: { factoryId: f!.id, itemType: "FINISHED_PRODUCT" } }),
  blueprints: await p.blueprint.count({ where: { factoryId: f!.id } }),
  bomItems: await p.bOMItem.count({ where: { bom: { factoryId: f!.id } } }),
});
await p.$disconnect();
