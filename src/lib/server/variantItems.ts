import prisma from "@/lib/prisma";

/**
 * Every ProductVariant is backed by a FINISHED_PRODUCT ItemMaster, so finished
 * goods carry stock, a spec and a place in the BOM graph. Variant creation goes
 * through here rather than each call site inventing its own item.
 */
export async function createBackingItem(input: {
  factoryId: string;
  name: string;
  sku: string;
}) {
  const group = await prisma.itemGroup.findFirst({
    where: { factoryId: input.factoryId, itemType: "FINISHED_PRODUCT", parentId: null },
    select: { id: true },
  });

  // SKUs are globally unique on ItemMaster; suffix until free so two variants
  // that normalise to the same code do not crash the insert.
  let sku = input.sku.trim() || `FG-${Date.now().toString(36).toUpperCase()}`;
  for (let i = 2; ; i++) {
    const clash = await prisma.itemMaster.findUnique({ where: { sku }, select: { id: true } });
    if (!clash) break;
    sku = `${input.sku}-${i}`;
  }

  const item = await prisma.itemMaster.create({
    data: {
      factoryId: input.factoryId,
      groupId: group?.id ?? null,
      itemType: "FINISHED_PRODUCT",
      manufacturingType: "MAKE",
      name: input.name.trim(),
      sku,
      itemCode: sku,
      defaultUOM: "PCS",
    },
  });
  return item.id;
}
