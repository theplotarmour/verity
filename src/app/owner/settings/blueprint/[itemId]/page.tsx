import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import prisma from "@/lib/prisma";
import { BlueprintBuilderClient } from "./BlueprintBuilderClient";
import { ItemType } from "@prisma/client";

/**
 * The blueprint editor, keyed on the item.
 *
 * Blueprints have always hung off ItemMaster; this route used to take a
 * ProductVariant id and look the item up through it. ProductVariant has held
 * zero rows since the spec engine took over, so every visit rendered "Variant
 * not found" — the page was unreachable rather than merely legacy.
 */
export default async function BlueprintPage({ params }: { params: Promise<{ itemId: string }> }) {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/onboarding");

  const { itemId } = await params;

  const item = await prisma.itemMaster.findFirst({
    where: { id: itemId, factoryId: dbUser.factoryId },
    include: { group: { select: { name: true } } },
  });

  if (!item) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        That item no longer exists. Open it from Master Data to edit its blueprint.
      </div>
    );
  }

  let blueprint = await prisma.blueprint.findUnique({
    where: { itemId: item.id }
  });

  if (!blueprint) {
    blueprint = await prisma.blueprint.create({
      data: { factoryId: dbUser.factoryId, itemId: item.id }
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
        item={item}
        initialBlueprint={blueprintVersion as any}
        departments={departments}
        materials={materials}
      />
    </div>
  );
}
