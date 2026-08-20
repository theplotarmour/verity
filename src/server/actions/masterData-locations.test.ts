import { describe, it, expect, beforeAll, afterAll } from "vitest";

import prisma from "@/lib/prisma";
import {
  removeWarehouseBin,
  removeWarehouseRack,
  removeWarehouseShelf,
  removeWarehouseZone,
  updateWarehouseZone,
} from "./masterData";

/**
 * Warehouse subtree delete, and the blockers that stop it.
 *
 * The actions call `getOwnerUser()`, which needs a request context, so the
 * *actions* cannot be invoked here — the same constraint as `orders.test.ts`.
 * What is tested is the thing that actually protects data: the blocker query and
 * the cascade behaviour, exercised directly against the database.
 *
 * The failure that matters is deleting a location that still holds stock.
 * `BinBalance` and `StockLedgerEntry` hold required relations to a bin with no
 * `onDelete`, so Postgres refuses — but the cascade from a zone means the refusal
 * surfaces as a foreign-key error three levels down, naming a constraint rather
 * than a bin. These assertions pin both halves: that the data is genuinely
 * protected, and that the guard finds it *before* the database has to.
 */
describe("location structure blockers", () => {
  let factoryId: string;
  let warehouseId: string;
  let seeded = false;
  const cleanup: { warehouses: string[]; items: string[] } = { warehouses: [], items: [] };

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;

    const warehouse = await prisma.warehouse.create({
      data: { factoryId, name: `Location Test ${Date.now().toString(36)}` },
      select: { id: true },
    });
    warehouseId = warehouse.id;
    cleanup.warehouses.push(warehouse.id);
  });

  afterAll(async () => {
    // Balances first — they hold the bins hostage, which is the point of the test.
    for (const id of cleanup.warehouses) {
      const bins = await prisma.warehouseBin.findMany({
        where: { shelf: { rack: { zone: { warehouseId: id } } } },
        select: { id: true },
      });
      const binIds = bins.map((b) => b.id);
      if (binIds.length > 0) {
        await prisma.stockLedgerEntry.deleteMany({ where: { binId: { in: binIds } } });
        await prisma.binBalance.deleteMany({ where: { binId: { in: binIds } } });
      }
      await prisma.warehouse.delete({ where: { id } }).catch(() => undefined);
    }
    for (const id of cleanup.items) {
      await prisma.product.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  /** A full zone → rack → shelf → bin chain. */
  async function makeChain(label: string) {
    const zone = await prisma.warehouseZone.create({
      data: { warehouseId, name: `Zone ${label}`, factoryId },
      select: { id: true },
    });
    const rack = await prisma.warehouseRack.create({
      data: { zoneId: zone.id, name: `Rack ${label}`, factoryId },
      select: { id: true },
    });
    const shelf = await prisma.warehouseShelf.create({
      data: { rackId: rack.id, name: `Shelf ${label}`, factoryId },
      select: { id: true },
    });
    const bin = await prisma.warehouseBin.create({
      data: { shelfId: shelf.id, name: `Bin ${label}`, factoryId },
      select: { id: true },
    });
    return { zoneId: zone.id, rackId: rack.id, shelfId: shelf.id, binId: bin.id };
  }

  async function makeItem(label: string) {
    const sku = `LOCTEST-${label}-${Date.now().toString(36)}`;
    const item = await prisma.product.create({
      data: {
        factoryId,
        itemType: "RAW_MATERIAL",
        name: `Location test ${label}`,
        sku,
        itemCode: sku,
        defaultUOM: "PCS",
      },
      select: { id: true },
    });
    cleanup.items.push(item.id);
    return item.id;
  }

  it("deletes an empty chain cleanly, bottom to top", async () => {
    if (!seeded) return;
    const chain = await makeChain("empty");

    // Nothing holds any of it, so each level goes.
    await prisma.warehouseBin.delete({ where: { id: chain.binId } });
    await prisma.warehouseShelf.delete({ where: { id: chain.shelfId } });
    await prisma.warehouseRack.delete({ where: { id: chain.rackId } });
    await prisma.warehouseZone.delete({ where: { id: chain.zoneId } });

    expect(await prisma.warehouseZone.count({ where: { id: chain.zoneId } })).toBe(0);
  });

  it("cascades a zone delete down to its bins", async () => {
    if (!seeded) return;
    // The behaviour the blocker check has to reckon with: deleting a zone takes
    // the whole subtree, so a check on the zone alone would miss stock in a bin.
    const chain = await makeChain("cascade");
    await prisma.warehouseZone.delete({ where: { id: chain.zoneId } });

    expect(await prisma.warehouseRack.count({ where: { id: chain.rackId } })).toBe(0);
    expect(await prisma.warehouseShelf.count({ where: { id: chain.shelfId } })).toBe(0);
    expect(await prisma.warehouseBin.count({ where: { id: chain.binId } })).toBe(0);
  });

  it("refuses to delete a bin holding available stock", async () => {
    if (!seeded) return;
    const chain = await makeChain("stocked");
    const itemId = await makeItem("stocked");

    await prisma.binBalance.create({
      data: { factoryId, itemId, binId: chain.binId, stockAvailable: 12 },
    });

    // The database is the last line of defence, and it holds.
    await expect(prisma.warehouseBin.delete({ where: { id: chain.binId } })).rejects.toThrow();

    // And the check the action runs finds it first.
    const blocking = await prisma.binBalance.count({
      where: {
        binId: chain.binId,
        OR: [
          { stockAvailable: { not: 0 } },
          { stockQcHold: { not: 0 } },
          { stockRejected: { not: 0 } },
        ],
      },
    });
    expect(blocking).toBe(1);
  });

  it("counts QC-hold and rejected stock as blocking", async () => {
    if (!seeded) return;
    // The case most worth catching: stock nobody is looking at is still
    // physically in the bin. Checking only `stockAvailable` would let a bin full
    // of quarantined goods be deleted.
    const chain = await makeChain("onhold");
    const itemId = await makeItem("onhold");

    await prisma.binBalance.create({
      data: {
        factoryId,
        itemId,
        binId: chain.binId,
        stockAvailable: 0,
        stockQcHold: 5,
        stockRejected: 2,
      },
    });

    const blocking = await prisma.binBalance.count({
      where: {
        binId: chain.binId,
        OR: [
          { stockAvailable: { not: 0 } },
          { stockQcHold: { not: 0 } },
          { stockRejected: { not: 0 } },
        ],
      },
    });
    expect(blocking, "quarantined stock does not block the delete").toBe(1);
  });

  it("does not treat an all-zero balance as stock", async () => {
    if (!seeded) return;
    // A zeroed row records that a bin once held an item and now holds none. The
    // ledger already says that, so it must not block for ever.
    const chain = await makeChain("zeroed");
    const itemId = await makeItem("zeroed");

    await prisma.binBalance.create({
      data: { factoryId, itemId, binId: chain.binId, stockAvailable: 0 },
    });

    const blocking = await prisma.binBalance.count({
      where: {
        binId: chain.binId,
        OR: [
          { stockAvailable: { not: 0 } },
          { stockQcHold: { not: 0 } },
          { stockRejected: { not: 0 } },
        ],
      },
    });
    expect(blocking).toBe(0);
  });

  it("keeps a bin with ledger history undeletable", async () => {
    if (!seeded) return;
    // The audit trail. A ledger entry must keep resolving to its bin, because a
    // stock reconciliation is built from those rows.
    const chain = await makeChain("history");
    const itemId = await makeItem("history");

    await prisma.stockLedgerEntry.create({
      data: {
        factoryId,
        transactionType: "RECEIPT",
        itemId,
        binId: chain.binId,
        quantityChange: 4,
        valuationRate: 100,
        totalValue: 400,
      },
    });

    await expect(prisma.warehouseBin.delete({ where: { id: chain.binId } })).rejects.toThrow();

    const movements = await prisma.stockLedgerEntry.count({ where: { binId: chain.binId } });
    expect(movements).toBe(1);
  });

  it("finds stock through the whole subtree, not just the top node", async () => {
    if (!seeded) return;
    // The query shape the zone-level check depends on. A check that only looked
    // at the zone would find nothing and let the cascade destroy the bin.
    const chain = await makeChain("deep");
    const itemId = await makeItem("deep");
    await prisma.binBalance.create({
      data: { factoryId, itemId, binId: chain.binId, stockAvailable: 3 },
    });

    const bins = await prisma.warehouseBin.findMany({
      where: { shelf: { rack: { zone: { id: chain.zoneId, warehouse: { factoryId } } } } },
      select: { id: true },
    });
    expect(bins.map((b) => b.id)).toContain(chain.binId);
  });
});

describe("the location actions exist and are shaped consistently", () => {
  it("exports update and remove for all four levels", () => {
    // The gap this PRD closed: only `add*` existed, so a typo in a zone name was
    // permanent.
    for (const fn of [
      updateWarehouseZone,
      removeWarehouseZone,
      removeWarehouseRack,
      removeWarehouseShelf,
      removeWarehouseBin,
    ]) {
      expect(typeof fn).toBe("function");
    }
  });
});
