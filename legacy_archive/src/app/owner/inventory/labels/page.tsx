import { redirect } from "next/navigation";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModulePage } from "@/platform/modules/guard";
import prisma from "@/lib/prisma";
import ItemLabelSheet from "./ItemLabelSheet";

// Printable SKU + bin labels for raw materials, so a physical shelf can be
// scanned back to the item record. Reuses the same QR service as the passport.
export default async function InventoryLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect("/");
  await guardModulePage("inventory");

  const { ids } = await searchParams;
  const only = ids?.split(",").map((s) => s.trim()).filter(Boolean);

  const items = await prisma.product.findMany({
    where: {
      factoryId: dbUser.factoryId,
      itemType: "RAW_MATERIAL",
      ...(only?.length ? { id: { in: only } } : {}),
    },
    select: { id: true, name: true, sku: true, defaultUOM: true },
    orderBy: { name: "asc" },
  });

  // Where each item actually sits, so the label can carry its bin.
  const balances = await prisma.binBalance.findMany({
    where: { factoryId: dbUser.factoryId, itemId: { in: items.map((i) => i.id) } },
    select: {
      itemId: true,
      stockAvailable: true,
      bin: {
        select: {
          name: true,
          shelf: {
            select: {
              name: true,
              rack: { select: { name: true, zone: { select: { name: true, warehouse: { select: { name: true } } } } } },
            },
          },
        },
      },
    },
  });

  const locationByItem = new Map<string, string>();
  for (const b of balances) {
    if (locationByItem.has(b.itemId)) continue;
    const parts = [
      b.bin.shelf.rack.zone.warehouse.name,
      b.bin.shelf.rack.zone.name,
      b.bin.shelf.rack.name,
      b.bin.shelf.name,
      b.bin.name,
    ].filter((p) => p && p !== "Default");
    locationByItem.set(b.itemId, parts.join(" / ") || b.bin.shelf.rack.zone.warehouse.name);
  }

  const factory = await prisma.factory.findUnique({
    where: { id: dbUser.factoryId },
    select: { name: true },
  });

  return (
    <ItemLabelSheet
      factoryName={factory?.name ?? "Factory"}
      items={items.map((i) => ({
        id: i.id,
        name: i.name,
        sku: i.sku,
        uom: i.defaultUOM,
        location: locationByItem.get(i.id) ?? null,
      }))}
    />
  );
}
