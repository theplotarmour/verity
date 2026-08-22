import { getOwnerUser } from "@/lib/server/owner";
import { redirect } from "next/navigation";
import { SettingsClient } from "./client";
import { PageHeader } from "@/components/design/PageHeader";
import { canUser, sanitizeMatrix } from "@/lib/server/permissions";
import { PermissionMatrixCard } from "./PermissionMatrixCard";
import { entitledModules } from "@/platform/modules/entitlements";

import prisma from "@/lib/prisma";
import { itemsInRootCategory } from "@/lib/server/categoryItems";
import { BRAND_ACCENT } from "@/lib/brand";

export default async function OwnerSettingsPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");
  if (!(await canUser(dbUser, "ACCESS_SETTINGS"))) redirect("/unauthorized");

  const settings = (dbUser.factory?.settings as any) || {};

  // The permission matrix only offers grants for modules this tenant actually
  // has. Resolved here rather than in the client component, which cannot read
  // entitlements.
  const activeModules = dbUser.factory?.organizationId
    ? await entitledModules(dbUser.factory.organizationId)
    : undefined;

  const [brands, models, productCategories, products, productVariants, coOwners, templates, suppliers, warehouses, materialCategories, materials, designs, colors, productTypes] = await Promise.all([
    Promise.resolve([]),
    Promise.resolve([]),
    // Legacy Product / ProductVariant catalogue is retired; settings/client no
    // longer reads these props, so they load nothing.
    Promise.resolve([] as any[]),
    Promise.resolve([] as any[]),
    Promise.resolve([] as any[]),
    prisma.user.findMany({ where: { factoryId: dbUser.factoryId, role: "CO_OWNER", isActive: true }, orderBy: { name: "asc" } }),
    prisma.checklistTemplate.findMany({
      where: { factoryId: dbUser.factoryId, status: "active" },
      include: { sections: { orderBy: { sortOrder: "asc" }, include: { checkpoints: { orderBy: { sortOrder: "asc" } } } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.supplier.findMany({ where: { factoryId: dbUser.factoryId }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ where: { factoryId: dbUser.factoryId }, include: { zones: true }, orderBy: { name: "asc" } }),
    Promise.resolve([] as any[]),
    prisma.product.findMany({ where: { factoryId: dbUser.factoryId, itemType: "RAW_MATERIAL" }, include: { category: true }, orderBy: { name: "asc" } }).then((items) => items.map((item) => ({ ...item, unit: item.defaultUOM }))),
    Promise.resolve([]),
    // Colours are items in the Colour category now, not their own table.
    itemsInRootCategory(dbUser.factoryId, "Colour"),
    Promise.resolve([] as any[]),
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
        themeColor: settings.themeColor || BRAND_ACCENT,
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
        productTypes
      }}
    />
    {canAssignRoles && (
      <PermissionMatrixCard
        saved={sanitizeMatrix(settings.permissions)}
        enabledModules={activeModules}
      />
    )}
    </div>
  );
}
