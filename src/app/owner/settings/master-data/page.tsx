import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { MasterDataPageClient } from "./client";

export default async function MasterDataPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");
  if (!(await canUser(dbUser, "ACCESS_SETTINGS"))) redirect("/unauthorized");

  const factoryId = dbUser.factoryId;

  const [brands, models, productCategories, products, productVariants, templates, suppliers, warehouses, materialCategories, materials, designs, colors, productTypes, specBoms] = await Promise.all([
    prisma.vehicleBrand.findMany({ where: { factoryId }, orderBy: { name: "asc" } }),
    prisma.vehicleModel.findMany({ where: { brand: { factoryId } }, include: { brand: true, generations: { include: { years: { include: { variants: true } } } } }, orderBy: { name: "asc" } }),
    prisma.productCategory.findMany({ where: { factoryId }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { factoryId }, include: { category: true }, orderBy: { name: "asc" } }),
    prisma.productVariant.findMany({ where: { product: { factoryId } }, include: { product: { include: { category: true } } }, orderBy: { name: "asc" } }),
    prisma.qCTemplate.findMany({
      where: { factoryId, status: "active" },
      include: { sections: { orderBy: { sortOrder: "asc" }, include: { checkpoints: { orderBy: { sortOrder: "asc" } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({ where: { factoryId }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { factoryId }, orderBy: { name: "asc" } }),
    prisma.materialCategory.findMany({ where: { factoryId }, orderBy: { name: "asc" } }),
    prisma.itemMaster.findMany({ where: { factoryId, itemType: "RAW_MATERIAL" }, include: { category: true }, orderBy: { name: "asc" } }).then((items) => items.map((item) => ({ ...item, unit: item.defaultUOM }))),
    prisma.design.findMany({ where: { factoryId }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.color.findMany({ where: { factoryId }, orderBy: { name: "asc" } }),
    prisma.productType.findMany({ where: { factoryId }, include: { fields: { orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.specBOM.findMany({ where: { factoryId } }),
  ]);


  return (
    <MasterDataPageClient
      masterData={{
        brands, models, productCategories, products, productVariants, templates,
        suppliers, warehouses, materialCategories, materials, designs, colors,
        productTypes, specBoms,
      }}
    />
  );
}
