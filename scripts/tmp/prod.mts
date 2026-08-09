import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
const fid = f!.id;
console.log("Vehicle tables after seed:", {
  brands: await p.vehicleBrand.count({ where: { factoryId: fid } }),
  models: await p.vehicleModel.count({ where: { brand: { factoryId: fid } } }),
  generations: await p.vehicleGeneration.count({ where: { model: { brand: { factoryId: fid } } } }),
  designs: await p.design.count({ where: { factoryId: fid } }),
  colors: await p.color.count({ where: { factoryId: fid } }),
});
console.log("Legacy product catalogue:", {
  products: await p.product.count({ where: { factoryId: fid } }),
  productVariants: await p.productVariant.count({ where: { product: { factoryId: fid } } }),
  productTypes: await p.productType.count({ where: { factoryId: fid } }),
});
console.log("Spec engine:", {
  finishedGoods: await p.itemMaster.count({ where: { factoryId: fid, itemType: "FINISHED_PRODUCT" } }),
  ordersWithItem: await p.salesOrder.count({ where: { factoryId: fid, itemId: { not: null } } }),
  ordersTotal: await p.salesOrder.count({ where: { factoryId: fid } }),
});
await p.$disconnect();
