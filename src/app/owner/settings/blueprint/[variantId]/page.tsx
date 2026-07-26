import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import prisma from "@/lib/prisma";
import { BlueprintBuilderClient } from "./BlueprintBuilderClient";
import { ItemType } from "@prisma/client";

export default async function BlueprintPage({ params }: { params: Promise<{ variantId: string }> }) {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");

  const { variantId } = await params;

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true }
  });

  if (!variant) return <div>Variant not found</div>;

  let blueprint = await prisma.blueprint.findUnique({
    where: { productVariantId: variantId }
  });

  if (!blueprint) {
    blueprint = await prisma.blueprint.create({
      data: {
        factoryId: dbUser.factoryId,
        productVariantId: variantId
      }
    });
  }

  // Load existing draft or create one
  let blueprintVersion = await prisma.blueprintVersion.findFirst({
    where: { blueprintId: blueprint.id, isActive: false },
    include: {
      routeSteps: { include: { department: true }, orderBy: { sequence: 'asc' } },
      bom: { include: { items: { include: { item: true } } } }
    }
  });

  if (!blueprintVersion) {
    blueprintVersion = await prisma.blueprintVersion.create({
      data: {
        blueprintId: blueprint.id,
        isActive: false,
        versionNumber: 1,
        name: "Draft Version"
      },
      include: {
        routeSteps: { include: { department: true } },
        bom: { include: { items: { include: { item: true } } } }
      }
    });
  }

  const [departments, materials] = await Promise.all([
    prisma.department.findMany({ where: { factoryId: dbUser.factoryId } }),
    prisma.itemMaster.findMany({ where: { factoryId: dbUser.factoryId, itemType: ItemType.RAW_MATERIAL } })
  ]);

  return (
    <div className="flex h-full w-full flex-col">
      <BlueprintBuilderClient 
        variant={variant} 
        initialBlueprint={blueprintVersion as any}
        departments={departments}
        materials={materials}
      />
    </div>
  );
}
