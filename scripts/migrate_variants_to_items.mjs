// Gives every ProductVariant a backing ItemMaster of type FINISHED_PRODUCT, so
// finished goods live in the same table as materials and a BOM's parent and
// children are both items.
//
// Idempotent and non-destructive: only variants with a null itemId are touched,
// and nothing is deleted. Safe to run against a populated database.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function uniqueSku(base) {
  const clean = (base || "FG").trim();
  let candidate = clean;
  for (let i = 2; ; i++) {
    const clash = await prisma.itemMaster.findUnique({
      where: { sku: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${clean}-${i}`;
  }
}

const factories = await prisma.factory.findMany({ select: { id: true, name: true } });

for (const factory of factories) {
  const group = await prisma.itemGroup.findFirst({
    where: { factoryId: factory.id, itemType: "FINISHED_PRODUCT", parentId: null },
  });
  if (!group) {
    console.log(`! ${factory.name}: no Finished Good group, skipping`);
    continue;
  }

  const variants = await prisma.productVariant.findMany({
    where: { itemId: null, product: { factoryId: factory.id } },
    include: { product: true },
  });

  for (const variant of variants) {
    const name = `${variant.product.name} ${variant.name}`.trim();
    const sku = await uniqueSku(variant.sku);

    const item = await prisma.itemMaster.create({
      data: {
        factoryId: factory.id,
        groupId: group.id,
        itemType: "FINISHED_PRODUCT",
        manufacturingType: "MAKE",
        name,
        sku,
        itemCode: sku,
        defaultUOM: "PCS",
      },
    });
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { itemId: item.id },
    });
    console.log(`+ ${variant.sku} -> item ${item.id} (${name})`);
  }

  const remaining = await prisma.productVariant.count({
    where: { itemId: null, product: { factoryId: factory.id } },
  });
  console.log(`= ${factory.name}: ${remaining} variant(s) still unlinked`);
}

await prisma.$disconnect();
