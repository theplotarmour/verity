// Stock movements that take the factory as an argument.
//
// Deliberately not "use server". Every export of a server-action module is a
// public endpoint, so as actions these two would have let any caller issue
// materials out of — or receive finished goods into — another tenant's
// warehouse, just by passing its id. Nothing here is called from a browser:
// production booking and inspection sign-off call them server-to-server, so
// they belong in a plain module that cannot be reached over the wire.

import prisma from "@/lib/prisma";

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
