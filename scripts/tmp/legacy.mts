import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const f = await p.factory.findFirst();
const fid = f!.id;
console.log("Legacy tables:", {
  productVariant: await p.productVariant.count({ where: { product: { factoryId: fid } } }),
  product: await p.product.count({ where: { factoryId: fid } }),
  productCategory: await p.productCategory.count({ where: { factoryId: fid } }),
  productType: await p.productType.count({ where: { factoryId: fid } }),
  materialCategory: await p.materialCategory.count({ where: { factoryId: fid } }),
  productCombination: await p.productCombination.count({ where: { factoryId: fid } }),
});
console.log("Still-live 'legacy-named' tables (now record sheets / reference masters):", {
  vehicleBrand: await p.vehicleBrand.count({ where: { factoryId: fid } }),
  design: await p.design.count({ where: { factoryId: fid } }),
  color: await p.color.count({ where: { factoryId: fid } }),
});
await p.$disconnect();
