import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
const fid = f!.id;
// Exactly what getMasterData() asks for.
const materials = await p.itemMaster.count({
  where: { factoryId: fid, itemType: "RAW_MATERIAL", status: "ACTIVE", category: { name: "Fabric" } },
});
const allRm = await p.itemMaster.count({ where: { factoryId: fid, itemType: "RAW_MATERIAL", status: "ACTIVE" } });
const byGroup = await p.itemMaster.count({
  where: { factoryId: fid, itemType: "RAW_MATERIAL", status: "ACTIVE", group: { name: "Fabric" } },
});
console.log({ materialsAsProductionQueriesThem: materials, allActiveRawMaterials: allRm, fabricsByGroup: byGroup });
console.log("MaterialCategory rows:", await p.materialCategory.count({ where: { factoryId: fid } }));
await p.$disconnect();
