// Stock movements that take the factory as an argument.
//
// Deliberately not "use server". Every export of a server-action module is a
// public endpoint, so as actions these two would have let any caller issue
// materials out of — or receive finished goods into — another tenant's
// warehouse, just by passing its id. Nothing here is called from a browser:
// production booking and inspection sign-off call them server-to-server, so
// they belong in a plain module that cannot be reached over the wire.

import prisma from "@/lib/prisma";
import { getItemBomFor } from "@/server/queries/spec";

// Ensures a Default zone/rack/shelf/bin chain for a warehouse; the old UI
// works at warehouse level while the new ledger is bin-level.
export async function ensureDefaultBin(factoryId: string, warehouseId: string) {
  // Fast path: the Default chain already exists for every warehouse after its
  // first stock transaction, so resolve the leaf bin in ONE query instead of
  // four sequential find-or-creates on every entry (perf audit P2).
  const existing = await prisma.warehouseBin.findFirst({
    where: {
      name: "Default",
      shelf: { name: "Default", rack: { name: "Default", zone: { name: "Default", warehouseId } } },
    },
    select: { id: true, shelfId: true, factoryId: true, name: true },
  });
  if (existing) return existing;

  // Cold path: build the chain (first-ever transaction for this warehouse).
  let zone = await prisma.warehouseZone.findFirst({ where: { warehouseId, name: "Default" } });
  if (!zone) zone = await prisma.warehouseZone.create({ data: { factoryId, warehouseId, name: "Default" } });

  let rack = await prisma.warehouseRack.findFirst({ where: { zoneId: zone.id, name: "Default" } });
  if (!rack) rack = await prisma.warehouseRack.create({ data: { factoryId, zoneId: zone.id, name: "Default" } });

  let shelf = await prisma.warehouseShelf.findFirst({ where: { rackId: rack.id, name: "Default" } });
  if (!shelf) shelf = await prisma.warehouseShelf.create({ data: { factoryId, rackId: rack.id, name: "Default" } });

  let bin = await prisma.warehouseBin.findFirst({ where: { shelfId: shelf.id, name: "Default" } });
  if (!bin) bin = await prisma.warehouseBin.create({ data: { factoryId, shelfId: shelf.id, name: "Default" } });

  return bin;
}

async function ensureDefaultWarehouse(factoryId: string) {
  let warehouse = await prisma.warehouse.findFirst({
    where: { factoryId, kind: "WAREHOUSE" },
    orderBy: { createdAt: "asc" },
  });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: { factoryId, name: "Main Warehouse", kind: "WAREHOUSE" },
    });
  }
  return warehouse;
}

export async function issueMaterialsForWorkOrder(params: {
  factoryId: string;
  workOrderId: string;
  blueprintVersionId: string;
  quantity: number;
  designId?: string | null;
  fabricItemId?: string | null;
}) {
  const { factoryId, workOrderId, blueprintVersionId, quantity } = params;

  const version = await prisma.blueprintVersion.findUnique({
    where: { id: blueprintVersionId },
    include: { blueprint: true },
  });
  const producedItemId = version?.blueprint?.itemId;
  let mergedItems: Array<{ itemId: string; quantity: number; wastePercent: number }> = [];

  if (producedItemId) {
    const resolvedBom = await getItemBomFor(factoryId, producedItemId);
    mergedItems = resolvedBom.map((line) => ({
      itemId: line.itemId,
      quantity: line.quantity,
      wastePercent: line.wastePercent,
    }));
  }

  if (mergedItems.length === 0) return { issued: 0 };

  const warehouse = await ensureDefaultWarehouse(factoryId);
  const bin = await ensureDefaultBin(factoryId, warehouse.id);

  for (const bomItem of mergedItems) {
    const totalQty = bomItem.quantity * quantity * (1 + bomItem.wastePercent / 100);

    await prisma.materialReservation.create({
      data: {
        factoryId,
        itemId: bomItem.itemId,
        quantity: totalQty,
        workOrderId,
        status: "ACTIVE",
      },
    });

    await prisma.stockLedgerEntry.create({
      data: {
        factoryId,
        transactionType: "ISSUE",
        itemId: bomItem.itemId,
        binId: bin.id,
        quantityChange: -totalQty,
        valuationRate: 0,
        totalValue: 0,
        referenceDocType: "WORK_ORDER",
        referenceDocId: workOrderId,
      },
    });

    await prisma.binBalance.upsert({
      where: { itemId_binId: { itemId: bomItem.itemId, binId: bin.id } },
      update: { stockAvailable: { decrement: totalQty } },
      create: { factoryId, itemId: bomItem.itemId, binId: bin.id, stockAvailable: -totalQty },
    });
  }

  return { issued: mergedItems.length };
}

export async function receiveFinishedGoods(params: {
  factoryId: string;
  workOrderId: string;
  /** The finished-good item produced. */
  itemId?: string;
  quantity: number;
}) {
  const { factoryId, workOrderId, quantity } = params;

  // Finished goods are received against the item directly.
  const itemId = params.itemId ?? null;
  if (!itemId) return { error: "No finished-good item to receive against" };

  const warehouse = await ensureDefaultWarehouse(factoryId);
  const bin = await ensureDefaultBin(factoryId, warehouse.id);

  await prisma.stockLedgerEntry.create({
    data: {
      factoryId,
      transactionType: "RECEIPT",
      itemId,
      binId: bin.id,
      quantityChange: quantity,
      valuationRate: 0,
      totalValue: 0,
      referenceDocType: "WORK_ORDER",
      referenceDocId: workOrderId,
    },
  });
  await prisma.binBalance.upsert({
    where: { itemId_binId: { itemId, binId: bin.id } },
    update: { stockAvailable: { increment: quantity } },
    create: { factoryId, itemId, binId: bin.id, stockAvailable: quantity },
  });

  await prisma.materialReservation.updateMany({
    where: { workOrderId, status: "ACTIVE" },
    data: { status: "CONSUMED" },
  });

  return { success: true };
}
