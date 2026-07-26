import { getOwnerUser } from "@/lib/server/owner";
import { redirect } from "next/navigation";
import { SettingsClient } from "./client";
import { PageHeader } from "@/components/design/PageHeader";
import { canUser, sanitizeMatrix } from "@/lib/server/permissions";
import { PermissionMatrixCard } from "./PermissionMatrixCard";

import prisma from "@/lib/prisma";

export default async function OwnerSettingsPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");
  if (!(await canUser(dbUser, "ACCESS_SETTINGS"))) redirect("/unauthorized");

  const settings = (dbUser.factory?.settings as any) || {};

  const [brands, models, productCategories, products, productVariants, coOwners, templates, suppliers, warehouses, materialCategories, materials, designs, colors, productTypes, specBoms] = await Promise.all([
    prisma.vehicleBrand.findMany({ where: { factoryId: dbUser.factoryId }, orderBy: { name: "asc" } }),
    prisma.vehicleModel.findMany({ where: { brand: { factoryId: dbUser.factoryId } }, include: { brand: true, generations: { include: { years: { include: { variants: true } } } } }, orderBy: { name: "asc" } }).then((models) => models.map((model) => ({ ...model, vehicleGenerations: model.generations }))),
    prisma.productCategory.findMany({ where: { factoryId: dbUser.factoryId }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { factoryId: dbUser.factoryId }, include: { category: true }, orderBy: { name: "asc" } }),
    prisma.productVariant.findMany({ where: { product: { factoryId: dbUser.factoryId } }, include: { product: true, blueprint: { include: { versions: { include: { bom: { include: { items: true } } } } } } }, orderBy: { name: "asc" } }).then((variants) => variants.map((variant) => {
      const version = variant.blueprint?.versions.find((v) => v.isActive) ?? variant.blueprint?.versions[0];
      const items = version?.bom?.items ?? [];
      return { ...variant, bom: items.map((item) => ({ id: item.id, materialId: item.itemId, qtyFormula: String(item.quantity), wastePercentage: item.wastePercent })) };
    })),
    prisma.user.findMany({ where: { factoryId: dbUser.factoryId, role: "CO_OWNER", isActive: true }, orderBy: { name: "asc" } }),
    prisma.qCTemplate.findMany({
      where: { factoryId: dbUser.factoryId, status: "active" },
      include: { sections: { orderBy: { sortOrder: "asc" }, include: { checkpoints: { orderBy: { sortOrder: "asc" } } } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.supplier.findMany({ where: { factoryId: dbUser.factoryId }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { factoryId: dbUser.factoryId }, include: { zones: true }, orderBy: { name: "asc" } }),
    prisma.materialCategory.findMany({ where: { factoryId: dbUser.factoryId }, orderBy: { name: "asc" } }),
    prisma.itemMaster.findMany({ where: { factoryId: dbUser.factoryId, itemType: "RAW_MATERIAL" }, include: { category: true }, orderBy: { name: "asc" } }).then((items) => items.map((item) => ({ ...item, unit: item.defaultUOM }))),
    prisma.design.findMany({ where: { factoryId: dbUser.factoryId }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.color.findMany({ where: { factoryId: dbUser.factoryId }, orderBy: { name: "asc" } }),
    prisma.productType.findMany({ where: { factoryId: dbUser.factoryId }, include: { fields: { orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.specBOM.findMany({ where: { factoryId: dbUser.factoryId } })
  ]);

  const canAssignRoles = await canUser(dbUser, "ASSIGN_ROLES");

  return (
    <div className="space-y-6">
    <SettingsClient
      currentUserRole={dbUser.role}
      coOwners={coOwners}
      initialData={{
        factoryName: dbUser.factory?.name || "",
        ownerName: dbUser.name || "",
        phone: dbUser.phone || "",
        themeColor: settings.themeColor || "#E11D48",
        logoUrl: dbUser.factory?.logoUrl || null,
        factoryId: dbUser.factoryId,
      }}
      masterData={{
        brands,
        models,
        productCategories,
        products,
        productVariants,
        templates,
        suppliers,
        warehouses,
        materialCategories,
        materials,
        designs,
        colors,
        productTypes,
        specBoms
      }}
    />
    {canAssignRoles && <PermissionMatrixCard saved={sanitizeMatrix(settings.permissions)} />}
    </div>
  );
}
