/**
 * Idempotent data enrichment for the trial workspace.
 *
 * Unlike `prisma/seed.ts` (which assumes an empty database), this script is
 * additive and safe to re-run against a live workspace: it never deletes, and
 * it skips anything that already exists. Use it when the catalogue is thin or
 * raw stock has drifted to zero.
 *
 * Stock is never hand-set — every quantity arrives through a RECEIPT ledger
 * entry plus its bin balance, exactly like the app does, so valuation and the
 * movement history stay truthful.
 *
 *   npx tsx scripts/enrich_seed.ts
 */
import { PrismaClient, ItemType } from "@prisma/client";

const prisma = new PrismaClient();

type ItemSpec = {
  name: string;
  category: string;
  subcategory?: string;
  type: ItemType;
  uom: string;
  minStock: number;
  rate: number; // valuation rate per unit
  keywords?: string[];
};

// A believable seat-cover factory catalogue.
const CATALOGUE: ItemSpec[] = [
  // Fabrics (selectable in the production studio)
  { name: "Shaka SPC", category: "Fabric", type: "RAW_MATERIAL", uom: "sqm", minStock: 50, rate: 620, keywords: ["shaka"] },
  { name: "Lifto SPC", category: "Fabric", type: "RAW_MATERIAL", uom: "sqm", minStock: 50, rate: 580, keywords: ["lifto"] },
  { name: "Heavy Napa", category: "Fabric", type: "RAW_MATERIAL", uom: "sqm", minStock: 50, rate: 700, keywords: ["napa"] },
  { name: "Soft Napa", category: "Fabric", type: "RAW_MATERIAL", uom: "sqm", minStock: 50, rate: 660, keywords: ["napa"] },

  // Other raw materials — BOM-only, never picked as a "fabric"
  { name: "Napa Black PU Leather", category: "Raw Material", subcategory: "PU Leather", type: "RAW_MATERIAL", uom: "sqm", minStock: 30, rate: 540 },
  { name: "Napa Beige PU Leather", category: "Raw Material", subcategory: "PU Leather", type: "RAW_MATERIAL", uom: "sqm", minStock: 30, rate: 540 },
  { name: "PU Foam 8mm", category: "Raw Material", subcategory: "Foam", type: "RAW_MATERIAL", uom: "sqm", minStock: 30, rate: 180 },
  { name: "PU Foam 12mm", category: "Raw Material", subcategory: "Foam", type: "RAW_MATERIAL", uom: "sqm", minStock: 25, rate: 240 },
  { name: "Bonded Thread", category: "Raw Material", subcategory: "Thread", type: "RAW_MATERIAL", uom: "cone", minStock: 20, rate: 145 },
  { name: "Easy-Break Airbag Thread", category: "Raw Material", subcategory: "Thread", type: "RAW_MATERIAL", uom: "cone", minStock: 10, rate: 320 },
  { name: "YKK Zipper 8in", category: "Raw Material", subcategory: "Zipper", type: "RAW_MATERIAL", uom: "pcs", minStock: 100, rate: 18 },
  { name: "Elastic Strap 25mm", category: "Raw Material", subcategory: "Elastic", type: "RAW_MATERIAL", uom: "mtr", minStock: 50, rate: 12 },
  { name: "Velcro Hook 20mm", category: "Raw Material", subcategory: "Velcro", type: "RAW_MATERIAL", uom: "mtr", minStock: 40, rate: 15 },
  { name: "Carxen Woven Label", category: "Raw Material", subcategory: "Labels", type: "RAW_MATERIAL", uom: "pcs", minStock: 200, rate: 4 },
  { name: "Plastic Retainer Hook", category: "Raw Material", subcategory: "Plastic Parts", type: "RAW_MATERIAL", uom: "pcs", minStock: 200, rate: 3 },

  // Packaging / consumables / tooling — proves the Item Master covers more
  // than fabric, and gives the type filter something to filter.
  { name: "Carton Box (Seat Set)", category: "Packaging", type: "PACKAGING", uom: "pcs", minStock: 100, rate: 42 },
  { name: "Bubble Wrap Roll", category: "Packaging", type: "PACKAGING", uom: "roll", minStock: 20, rate: 380 },
  { name: "Poly Bag Large", category: "Packaging", type: "PACKAGING", uom: "pcs", minStock: 250, rate: 6 },
  { name: "Fabric Marking Chalk", category: "Consumables", type: "CONSUMABLE", uom: "box", minStock: 10, rate: 90 },
  { name: "Machine Oil 1L", category: "Consumables", type: "CONSUMABLE", uom: "ltr", minStock: 6, rate: 260 },
  { name: "Sewing Machine Needle Pack", category: "Spare Parts", type: "SPARE_PART", uom: "pkt", minStock: 20, rate: 210 },
  { name: "Industrial Scissors", category: "Spare Parts", type: "TOOL", uom: "pcs", minStock: 2, rate: 850 },
];

const CODE_PREFIX: Record<string, string> = {
  RAW_MATERIAL: "RM", SEMI_FINISHED: "SF", FINISHED_PRODUCT: "FG", CONSUMABLE: "CN",
  PACKAGING: "PK", SPARE_PART: "SP", MACHINERY: "MC", TOOL: "TL", ASSET: "AS", SERVICE: "SV",
};

async function nextCode(factoryId: string, type: ItemType) {
  const prefix = CODE_PREFIX[type] ?? "RM";
  const rows = await prisma.itemMaster.findMany({
    where: { factoryId, itemCode: { startsWith: `${prefix}-` } },
    select: { itemCode: true },
  });
  const max = rows.reduce((m, r) => {
    const n = parseInt((r.itemCode ?? "").split("-")[1] ?? "0", 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `${prefix}-${String(max + 1).padStart(5, "0")}`;
}

async function uniqueSku(base: string) {
  let candidate = base;
  for (let i = 2; ; i++) {
    const clash = await prisma.itemMaster.findUnique({ where: { sku: candidate }, select: { id: true } });
    if (!clash) return candidate;
    candidate = `${base}-${i}`;
  }
}

async function main() {
  const factory = await prisma.factory.findFirst({ orderBy: { createdAt: "asc" } });
  if (!factory) throw new Error("No factory found — run the base seed first.");
  const factoryId = factory.id;
  console.log(`Enriching factory: ${factory.name}\n`);

  // ---- 1. Storage location -------------------------------------------------
  let warehouse = await prisma.warehouse.findFirst({ where: { factoryId, kind: { not: "STORE" } } });
  if (!warehouse) warehouse = await prisma.warehouse.create({ data: { factoryId, name: "Main Warehouse", kind: "WAREHOUSE" } });
  let zone = await prisma.warehouseZone.findFirst({ where: { warehouseId: warehouse.id } });
  if (!zone) zone = await prisma.warehouseZone.create({ data: { factoryId, warehouseId: warehouse.id, name: "Default" } });
  let rack = await prisma.warehouseRack.findFirst({ where: { zoneId: zone.id } });
  if (!rack) rack = await prisma.warehouseRack.create({ data: { factoryId, zoneId: zone.id, name: "Default" } });
  let shelf = await prisma.warehouseShelf.findFirst({ where: { rackId: rack.id } });
  if (!shelf) shelf = await prisma.warehouseShelf.create({ data: { factoryId, rackId: rack.id, name: "Default" } });
  let bin = await prisma.warehouseBin.findFirst({ where: { shelfId: shelf.id } });
  if (!bin) bin = await prisma.warehouseBin.create({ data: { factoryId, shelfId: shelf.id, name: "Default" } });

  // ---- 2. Category tree ----------------------------------------------------
  const categoryIds = new Map<string, string>();
  const subcategoryIds = new Map<string, string>();
  for (const spec of CATALOGUE) {
    if (!categoryIds.has(spec.category)) {
      let cat = await prisma.materialCategory.findFirst({
        where: { factoryId, name: { equals: spec.category, mode: "insensitive" } },
      });
      if (!cat) {
        cat = await prisma.materialCategory.create({ data: { factoryId, name: spec.category } });
        console.log(`  + category ${spec.category}`);
      }
      categoryIds.set(spec.category, cat.id);
    }
    if (spec.subcategory) {
      const key = `${spec.category}:${spec.subcategory}`;
      if (!subcategoryIds.has(key)) {
        const categoryId = categoryIds.get(spec.category)!;
        let sub = await prisma.materialSubcategory.findFirst({
          where: { factoryId, categoryId, name: { equals: spec.subcategory, mode: "insensitive" } },
        });
        if (!sub) {
          sub = await prisma.materialSubcategory.create({ data: { factoryId, categoryId, name: spec.subcategory } });
          console.log(`  + subcategory ${spec.category}/${spec.subcategory}`);
        }
        subcategoryIds.set(key, sub.id);
      }
    }
  }

  // ---- 3. Items ------------------------------------------------------------
  let created = 0;
  const itemIds: Array<{ id: string; spec: ItemSpec }> = [];
  for (const spec of CATALOGUE) {
    let item = await prisma.itemMaster.findFirst({
      where: { factoryId, name: { equals: spec.name, mode: "insensitive" } },
    });
    if (!item) {
      const code = await nextCode(factoryId, spec.type);
      item = await prisma.itemMaster.create({
        data: {
          factoryId, name: spec.name, itemCode: code, sku: await uniqueSku(code),
          itemType: spec.type, defaultUOM: spec.uom, status: "ACTIVE",
          minStockLevel: spec.minStock, searchKeywords: spec.keywords ?? [],
          categoryId: categoryIds.get(spec.category) ?? null,
          subcategoryId: spec.subcategory ? subcategoryIds.get(`${spec.category}:${spec.subcategory}`) ?? null : null,
        },
      });
      created++;
      console.log(`  + item ${spec.name} (${code})`);
    } else if (item.minStockLevel === 0 && spec.minStock > 0) {
      await prisma.itemMaster.update({ where: { id: item.id }, data: { minStockLevel: spec.minStock } });
    }
    itemIds.push({ id: item.id, spec });
  }

  // ---- 4. Opening stock (as real RECEIPT transactions) ---------------------
  let receipts = 0;
  for (const { id, spec } of itemIds) {
    const balances = await prisma.binBalance.findMany({ where: { itemId: id }, select: { stockAvailable: true } });
    const onHand = balances.reduce((s, b) => s + b.stockAvailable, 0);
    // Comfortably above the reorder point so nothing sits in "low stock".
    const target = Math.max(Math.ceil(spec.minStock * 3), 60);
    if (onHand >= spec.minStock) continue;

    const qty = target - onHand;
    await prisma.$transaction(async (tx) => {
      await tx.stockLedgerEntry.create({
        data: {
          factoryId, transactionType: "RECEIPT", itemId: id, binId: bin!.id,
          quantityChange: qty, valuationRate: spec.rate, totalValue: qty * spec.rate,
          referenceDocType: "OPENING_STOCK", stockStatus: "AVAILABLE",
        },
      });
      const existing = await tx.binBalance.findUnique({ where: { itemId_binId: { itemId: id, binId: bin!.id } } });
      if (existing) {
        await tx.binBalance.update({
          where: { itemId_binId: { itemId: id, binId: bin!.id } },
          data: { stockAvailable: { increment: qty } },
        });
      } else {
        await tx.binBalance.create({ data: { factoryId, itemId: id, binId: bin!.id, stockAvailable: qty } });
      }
    });
    receipts++;
    console.log(`  ↑ stock ${spec.name}: ${onHand} → ${target} ${spec.uom}`);
  }

  // ---- 5. Suppliers + a live purchase order --------------------------------
  const suppliers = [
    { name: "Fabric House Ludhiana", phone: "9815000000", leadTimeDays: 5 },
    { name: "Foam & Trims Delhi", phone: "9811000111", leadTimeDays: 3 },
    { name: "Zipper World Mumbai", phone: "9820000222", leadTimeDays: 7 },
  ];
  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { factoryId, name: s.name } });
    if (!existing) {
      await prisma.supplier.create({ data: { factoryId, ...s } });
      console.log(`  + supplier ${s.name}`);
    }
  }
  const supplier = await prisma.supplier.findFirst({ where: { factoryId } });
  const shaka = itemIds.find((i) => i.spec.name === "Shaka SPC");
  if (supplier && shaka) {
    const poNumber = "PO-TRIAL-101";
    const existingPo = await prisma.purchaseOrder.findFirst({ where: { poNumber } });
    if (!existingPo) {
      await prisma.purchaseOrder.create({
        data: {
          factoryId, poNumber, supplierId: supplier.id, status: "SUBMITTED",
          items: { create: [{ materialId: shaka.id, quantity: 80, rate: shaka.spec.rate }] },
        },
      });
      console.log(`  + purchase order ${poNumber} (awaiting delivery)`);
    }
  }

  // ---- Summary -------------------------------------------------------------
  const [itemCount, low, ledgerCount] = await Promise.all([
    prisma.itemMaster.count({ where: { factoryId } }),
    prisma.itemMaster.findMany({
      where: { factoryId },
      select: { name: true, minStockLevel: true, binBalances: { select: { stockAvailable: true } } },
    }),
    prisma.stockLedgerEntry.count({ where: { factoryId } }),
  ]);
  const stillLow = low.filter(
    (i) => i.binBalances.reduce((s, b) => s + b.stockAvailable, 0) < i.minStockLevel
  );
  console.log(`\nDone. items=${itemCount} (+${created} new) receipts=+${receipts} ledger=${ledgerCount}`);
  console.log(`Low-stock items remaining: ${stillLow.length}${stillLow.length ? " — " + stillLow.map((i) => i.name).join(", ") : ""}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
