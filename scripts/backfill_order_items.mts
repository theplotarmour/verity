// Resolves every existing order's spec to a finished-good item, using the same
// code path createOrder now runs. Idempotent: orders that already carry an item
// are skipped.
import { PrismaClient } from "@prisma/client";
import { resolveOrderItem } from "../src/server/actions/orderItemResolver";

const prisma = new PrismaClient();
const factories = await prisma.factory.findMany({ select: { id: true, name: true } });

for (const f of factories) {
  const orders = await prisma.salesOrder.findMany({
    where: { factoryId: f.id, itemId: null },
    select: {
      id: true, soNumber: true, productTypeId: true, vehicleBrandId: true,
      vehicleModelId: true, materialId: true, designId: true, colorId: true,
      seatType: true, hasArmrest: true, headrestCount: true,
    },
    orderBy: { orderDate: "asc" },
  });
  console.log(`${f.name}: ${orders.length} order(s) without an item`);
  for (const o of orders) {
    const itemId = await resolveOrderItem(f.id, o);
    if (!itemId) { console.log(`  ! ${o.soNumber}: could not resolve`); continue; }
    await prisma.salesOrder.update({ where: { id: o.id }, data: { itemId } });
    const item = await prisma.itemMaster.findUniqueOrThrow({ where: { id: itemId } });
    console.log(`  + ${o.soNumber} -> ${item.name}`);
  }

  // The lines too. Orders written before ProductVariant was retired carry a
  // stale productVariantId and no item, so an order could resolve while the
  // line under it still pointed at a table that no longer exists.
  const lines = await prisma.salesOrderItem.findMany({
    where: { itemId: null, salesOrder: { factoryId: f.id, itemId: { not: null } } },
    select: { id: true, salesOrder: { select: { soNumber: true, itemId: true } } },
  });
  console.log(`${f.name}: ${lines.length} order line(s) without an item`);
  for (const l of lines) {
    await prisma.salesOrderItem.update({
      where: { id: l.id },
      data: { itemId: l.salesOrder.itemId },
    });
    console.log(`  + line on ${l.salesOrder.soNumber}`);
  }
}
await prisma.$disconnect();
