/**
 * Seeds the Carxen design catalogue (families + designs), the raw materials those
 * designs consume, and a detailed spec-BOM for every design.
 *
 * Idempotent and additive, like the other enrich_* scripts: it never wipes, only
 * fills gaps and corrects the family of designs that moved. Opening stock for the
 * new items arrives through real RECEIPT ledger entries + bin balances (never
 * hand-set), so valuation and movement history stay truthful.
 *
 *   npx tsx scripts/seed_designs.ts
 */
import { PrismaClient, ItemType } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// 1. The catalogue, transcribed from the printed sheet + its handwritten edits:
//    - "New N Type" struck from ULTRA and rewritten under PRO SERIES
//    - "Arrow" struck and replaced by "Winger"
//    - "Prism" marked ✗ (dropped)
//    - QUILTS #9 struck out (illegible — omitted)
//    - "Football" belongs to SUPER QUILTS
// ---------------------------------------------------------------------------
const CATALOGUE: Record<string, string[]> = {
  "ULTRA": ["Triple Seam", "Super Capt", "Winger", "Rocker", "Original", "Head Atelier", "5 Lines"],
  "ERGO FIT": ["Vertex", "Archer", "Spykar", "Hilfiger"],
  "PRO SERIES": ["Lancer", "Super Lancer", "Lexa Plus", "7 Lines", "New N Type"],
  "PRO (+)": ["Radiator", "N Radiator"],
  "QUILTS": ["Zig Zag", "Wavy Quilt", "Snake", "Qubec", "Diamond", "Eagle", "Chain Type", "Recti Quilt", "Gt-Line"],
  "SUPER QUILTS": ["Edition", "Wire Quilt", "Football", "S-Taper", "Capsule Cut"],
};

// Designs struck off the sheet. Removed only when nothing references them.
const RETIRED = ["Arrow", "Prism"];

// Standard fabric consumption (m/unit) per family — drives CAD's automatic
// material calculation.
const FABRIC_CONSUMPTION: Record<string, number> = {
  "ULTRA": 4.6, "ERGO FIT": 4.4, "PRO SERIES": 4.2,
  "PRO (+)": 4.6, "QUILTS": 4.4, "SUPER QUILTS": 4.8,
};

// ---------------------------------------------------------------------------
// 2. Items these designs consume that the catalogue was missing.
// ---------------------------------------------------------------------------
type ItemSpec = {
  name: string; category: string; subcategory?: string;
  type: ItemType; uom: string; minStock: number; rate: number;
};

const NEW_ITEMS: ItemSpec[] = [
  { name: "Perforated Napa", category: "Fabric", subcategory: "Napa", type: "RAW_MATERIAL", uom: "sqm", minStock: 40, rate: 720 },
  { name: "Air Mesh Fabric", category: "Fabric", type: "RAW_MATERIAL", uom: "sqm", minStock: 30, rate: 410 },
  { name: "Backing Cloth (Non-woven)", category: "Raw Material", subcategory: "Fabric", type: "RAW_MATERIAL", uom: "sqm", minStock: 60, rate: 95 },
  { name: "Laminated Foam 5mm", category: "Raw Material", subcategory: "Foam", type: "RAW_MATERIAL", uom: "sqm", minStock: 40, rate: 160 },
  { name: "Foam Sheet 20mm", category: "Raw Material", subcategory: "Foam", type: "RAW_MATERIAL", uom: "sqm", minStock: 25, rate: 310 },
  { name: "Quilting Thread", category: "Raw Material", subcategory: "Thread", type: "RAW_MATERIAL", uom: "cone", minStock: 20, rate: 190 },
  { name: "Embroidery Thread", category: "Raw Material", subcategory: "Thread", type: "RAW_MATERIAL", uom: "cone", minStock: 12, rate: 240 },
  { name: "Piping Cord 4mm", category: "Raw Material", subcategory: "Piping", type: "RAW_MATERIAL", uom: "mtr", minStock: 100, rate: 9 },
  { name: "Nylon Binding Tape 20mm", category: "Raw Material", subcategory: "Elastic", type: "RAW_MATERIAL", uom: "mtr", minStock: 80, rate: 11 },
  { name: "Seat Belt Slot Reinforcement", category: "Raw Material", subcategory: "Plastic Parts", type: "RAW_MATERIAL", uom: "pcs", minStock: 100, rate: 7 },
  { name: "Steel J-Hook", category: "Raw Material", subcategory: "Metal Parts", type: "RAW_MATERIAL", uom: "pcs", minStock: 150, rate: 5 },
  { name: "Spray Adhesive 500ml", category: "Consumables", type: "CONSUMABLE", uom: "can", minStock: 12, rate: 340 },
];

// ---------------------------------------------------------------------------
// 3. Spec-BOM per design family: what one finished set consumes.
//    { item name, qty per unit, waste % }
// ---------------------------------------------------------------------------
type Line = { item: string; qty: number; waste?: number };

const COMMON_FINISHING: Line[] = [
  { item: "Easy-Break Airbag Thread", qty: 0.05 },   // side-panel safety seam
  { item: "Seat Belt Slot Reinforcement", qty: 4 },
  { item: "Carxen Woven Label", qty: 1 },
  { item: "Carton Box (Seat Set)", qty: 1 },
  { item: "Poly Bag Large", qty: 1 },
  { item: "Spray Adhesive 500ml", qty: 0.08 },
];

const BOM_BY_FAMILY: Record<string, Line[]> = {
  // Premium multi-panel build: piping on every seam.
  "ULTRA": [
    { item: "Heavy Napa", qty: 4.6, waste: 8 },
    { item: "Laminated Foam 5mm", qty: 3.6, waste: 6 },
    { item: "Backing Cloth (Non-woven)", qty: 3.2, waste: 5 },
    { item: "Bonded Thread", qty: 0.35 },
    { item: "Piping Cord 4mm", qty: 6, waste: 5 },
    { item: "YKK Zipper 8in", qty: 6 },
    { item: "Elastic Strap 25mm", qty: 4 },
    { item: "Velcro Hook 20mm", qty: 2.5 },
    { item: "Steel J-Hook", qty: 10 },
    ...COMMON_FINISHING,
  ],
  // Contoured fit: more elastic + tensioning hooks, branded embroidery.
  "ERGO FIT": [
    { item: "Soft Napa", qty: 4.4, waste: 7 },
    { item: "Laminated Foam 5mm", qty: 3.8, waste: 6 },
    { item: "Backing Cloth (Non-woven)", qty: 3.2, waste: 5 },
    { item: "Bonded Thread", qty: 0.3 },
    { item: "Embroidery Thread", qty: 0.05 },
    { item: "YKK Zipper 8in", qty: 6 },
    { item: "Elastic Strap 25mm", qty: 5 },
    { item: "Velcro Hook 20mm", qty: 3 },
    { item: "Plastic Retainer Hook", qty: 12 },
    ...COMMON_FINISHING,
  ],
  // Workhorse build.
  "PRO SERIES": [
    { item: "Napa Black PU Leather", qty: 4.2, waste: 7 },
    { item: "PU Foam 8mm", qty: 3.2, waste: 5 },
    { item: "Backing Cloth (Non-woven)", qty: 3.0, waste: 5 },
    { item: "Bonded Thread", qty: 0.28 },
    { item: "YKK Zipper 8in", qty: 6 },
    { item: "Elastic Strap 25mm", qty: 3.5 },
    { item: "Velcro Hook 20mm", qty: 2 },
    { item: "Plastic Retainer Hook", qty: 8 },
    ...COMMON_FINISHING,
  ],
  // Ventilated: perforated face with air-mesh inserts.
  "PRO (+)": [
    { item: "Perforated Napa", qty: 3.0, waste: 8 },
    { item: "Air Mesh Fabric", qty: 1.6, waste: 6 },
    { item: "Laminated Foam 5mm", qty: 3.4, waste: 6 },
    { item: "Backing Cloth (Non-woven)", qty: 3.0, waste: 5 },
    { item: "Bonded Thread", qty: 0.32 },
    { item: "Nylon Binding Tape 20mm", qty: 5 },
    { item: "YKK Zipper 8in", qty: 6 },
    { item: "Elastic Strap 25mm", qty: 3.5 },
    { item: "Velcro Hook 20mm", qty: 2 },
    { item: "Plastic Retainer Hook", qty: 8 },
    ...COMMON_FINISHING,
  ],
  // Quilted panels: thicker foam + a dedicated quilting thread.
  "QUILTS": [
    { item: "Napa Beige PU Leather", qty: 4.4, waste: 9 },
    { item: "PU Foam 12mm", qty: 3.6, waste: 7 },
    { item: "Backing Cloth (Non-woven)", qty: 3.2, waste: 5 },
    { item: "Quilting Thread", qty: 0.45 },
    { item: "Bonded Thread", qty: 0.25 },
    { item: "YKK Zipper 8in", qty: 6 },
    { item: "Elastic Strap 25mm", qty: 3.5 },
    { item: "Velcro Hook 20mm", qty: 2 },
    { item: "Plastic Retainer Hook", qty: 8 },
    ...COMMON_FINISHING,
  ],
  // Heaviest quilting: 20mm foam, piped edges, most thread.
  "SUPER QUILTS": [
    { item: "Heavy Napa", qty: 4.8, waste: 10 },
    { item: "Foam Sheet 20mm", qty: 3.8, waste: 8 },
    { item: "Backing Cloth (Non-woven)", qty: 3.4, waste: 5 },
    { item: "Quilting Thread", qty: 0.6 },
    { item: "Bonded Thread", qty: 0.3 },
    { item: "Piping Cord 4mm", qty: 6, waste: 5 },
    { item: "YKK Zipper 8in", qty: 6 },
    { item: "Elastic Strap 25mm", qty: 4 },
    { item: "Velcro Hook 20mm", qty: 2.5 },
    { item: "Steel J-Hook", qty: 10 },
    ...COMMON_FINISHING,
  ],
};

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
  console.log(`Seeding design catalogue for: ${factory.name}\n`);

  // Designs are seat-cover designs; anchor them to that product so QC template
  // resolution and the studio's product filter work.
  const seatCover = await prisma.product.findFirst({
    where: { factoryId, name: { equals: "Seat Cover", mode: "insensitive" } },
    select: { id: true },
  });

  // ---- Storage location for the opening-stock receipts --------------------
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

  // ---- 1. Categories / subcategories for the new items ---------------------
  const catIds = new Map<string, string>();
  const subIds = new Map<string, string>();
  for (const spec of NEW_ITEMS) {
    if (!catIds.has(spec.category)) {
      let cat = await prisma.materialCategory.findFirst({ where: { factoryId, name: { equals: spec.category, mode: "insensitive" } } });
      if (!cat) { cat = await prisma.materialCategory.create({ data: { factoryId, name: spec.category } }); console.log(`  + category ${spec.category}`); }
      catIds.set(spec.category, cat.id);
    }
    if (spec.subcategory) {
      const key = `${spec.category}:${spec.subcategory}`;
      if (!subIds.has(key)) {
        const categoryId = catIds.get(spec.category)!;
        let sub = await prisma.materialSubcategory.findFirst({ where: { factoryId, categoryId, name: { equals: spec.subcategory, mode: "insensitive" } } });
        if (!sub) { sub = await prisma.materialSubcategory.create({ data: { factoryId, categoryId, name: spec.subcategory } }); console.log(`  + subcategory ${spec.category}/${spec.subcategory}`); }
        subIds.set(key, sub.id);
      }
    }
  }

  // ---- 2. Items ------------------------------------------------------------
  let itemsCreated = 0;
  for (const spec of NEW_ITEMS) {
    const existing = await prisma.itemMaster.findFirst({ where: { factoryId, name: { equals: spec.name, mode: "insensitive" } } });
    if (existing) continue;
    const code = await nextCode(factoryId, spec.type);
    await prisma.itemMaster.create({
      data: {
        factoryId, name: spec.name, itemCode: code, sku: await uniqueSku(code),
        itemType: spec.type, defaultUOM: spec.uom, status: "ACTIVE",
        minStockLevel: spec.minStock,
        categoryId: catIds.get(spec.category) ?? null,
        subcategoryId: spec.subcategory ? subIds.get(`${spec.category}:${spec.subcategory}`) ?? null : null,
      },
    });
    itemsCreated++;
    console.log(`  + item ${spec.name} (${code})`);
  }

  // ---- 3. Opening stock for anything below its reorder point ---------------
  let receipts = 0;
  for (const spec of NEW_ITEMS) {
    const item = await prisma.itemMaster.findFirst({ where: { factoryId, name: { equals: spec.name, mode: "insensitive" } }, select: { id: true } });
    if (!item) continue;
    const balances = await prisma.binBalance.findMany({ where: { itemId: item.id }, select: { stockAvailable: true } });
    const onHand = balances.reduce((s, b) => s + b.stockAvailable, 0);
    if (onHand >= spec.minStock) continue;
    const target = Math.max(Math.ceil(spec.minStock * 3), 60);
    const qty = target - onHand;
    await prisma.$transaction(async (tx) => {
      await tx.stockLedgerEntry.create({
        data: {
          factoryId, transactionType: "RECEIPT", itemId: item.id, binId: bin!.id,
          quantityChange: qty, valuationRate: spec.rate, totalValue: qty * spec.rate,
          referenceDocType: "OPENING_STOCK", stockStatus: "AVAILABLE",
        },
      });
      const existing = await tx.binBalance.findUnique({ where: { itemId_binId: { itemId: item.id, binId: bin!.id } } });
      if (existing) {
        await tx.binBalance.update({ where: { itemId_binId: { itemId: item.id, binId: bin!.id } }, data: { stockAvailable: { increment: qty } } });
      } else {
        await tx.binBalance.create({ data: { factoryId, itemId: item.id, binId: bin!.id, stockAvailable: qty } });
      }
    });
    receipts++;
    console.log(`  ↑ stock ${spec.name}: ${onHand} → ${target} ${spec.uom}`);
  }

  // ---- 4. Designs: create missing, correct the family of moved ones --------
  let designsCreated = 0, designsMoved = 0;
  for (const [family, names] of Object.entries(CATALOGUE)) {
    for (const name of names) {
      const existing = await prisma.design.findFirst({ where: { factoryId, name: { equals: name, mode: "insensitive" } } });
      if (!existing) {
        await prisma.design.create({
          data: {
            factoryId, name, category: family,
            productId: seatCover?.id ?? null,
            fabricConsumption: FABRIC_CONSUMPTION[family] ?? null,
          },
        });
        designsCreated++;
        console.log(`  + design ${family} / ${name}`);
      } else if (existing.category !== family || existing.fabricConsumption == null) {
        // A design that moved family on the sheet (e.g. New N Type → PRO SERIES,
        // Football → SUPER QUILTS) is corrected in place, keeping its id so
        // existing orders stay linked.
        await prisma.design.update({
          where: { id: existing.id },
          data: {
            category: family,
            fabricConsumption: existing.fabricConsumption ?? FABRIC_CONSUMPTION[family] ?? null,
            productId: existing.productId ?? seatCover?.id ?? null,
          },
        });
        if (existing.category !== family) {
          designsMoved++;
          console.log(`  ~ design ${name}: ${existing.category ?? "—"} → ${family}`);
        }
      }
    }
  }

  // ---- 5. Retire struck-off designs (only when unused) ---------------------
  for (const name of RETIRED) {
    const d = await prisma.design.findFirst({
      where: { factoryId, name: { equals: name, mode: "insensitive" } },
      include: { _count: { select: { salesOrders: true } } },
    });
    if (!d) continue;
    if (d._count.salesOrders > 0) {
      console.log(`  ! kept "${name}" — struck off the sheet but used by ${d._count.salesOrders} order(s)`);
      continue;
    }
    await prisma.specBOM.deleteMany({ where: { factoryId, refType: "DESIGN", refId: d.id } });
    await prisma.design.delete({ where: { id: d.id } });
    console.log(`  - retired design ${name}`);
  }

  // ---- 6. Drop spec-BOMs whose design no longer exists ---------------------
  const allDesignIds = new Set((await prisma.design.findMany({ where: { factoryId }, select: { id: true } })).map((d) => d.id));
  const designBoms = await prisma.specBOM.findMany({ where: { factoryId, refType: "DESIGN" }, select: { id: true, refId: true } });
  const orphanIds = designBoms.filter((b) => !allDesignIds.has(b.refId)).map((b) => b.id);
  if (orphanIds.length > 0) {
    await prisma.specBOM.deleteMany({ where: { id: { in: orphanIds } } });
    console.log(`  - removed ${orphanIds.length} orphaned spec-BOM row(s) (design no longer exists)`);
  }

  // ---- 7. Spec-BOM per design ---------------------------------------------
  // Pass --force to rewrite BOMs that already exist (otherwise a BOM the owner
  // has tuned by hand is never touched).
  const force = process.argv.includes("--force");
  const allItems = await prisma.itemMaster.findMany({ where: { factoryId }, select: { id: true, name: true } });
  const itemByName = new Map(allItems.map((i) => [i.name.toLowerCase(), i.id]));

  let bomsWritten = 0, bomsRewritten = 0;
  const missingItems = new Set<string>();
  const thinBoms: string[] = [];
  for (const [family, names] of Object.entries(CATALOGUE)) {
    const recipe = BOM_BY_FAMILY[family] ?? [];
    const lines = recipe
      .map((l) => {
        const itemId = itemByName.get(l.item.toLowerCase());
        if (!itemId) missingItems.add(l.item);
        return itemId ? { itemId, quantity: l.qty, wastePercent: l.waste ?? 0 } : null;
      })
      .filter((l): l is { itemId: string; quantity: number; wastePercent: number } => !!l);
    if (lines.length === 0) continue;

    for (const name of names) {
      const design = await prisma.design.findFirst({ where: { factoryId, name: { equals: name, mode: "insensitive" } }, select: { id: true } });
      if (!design) continue;
      const existing = await prisma.specBOM.findUnique({ where: { refType_refId: { refType: "DESIGN", refId: design.id } } });
      if (existing && !force) {
        // Never overwrite a BOM the owner has tuned — but flag the ones that look
        // like leftover stubs so they can be reviewed (or re-run with --force).
        const n = Array.isArray(existing.items) ? (existing.items as any[]).length : 0;
        if (n < 5) thinBoms.push(`${name} (${n} line${n === 1 ? "" : "s"})`);
        continue;
      }
      if (existing) {
        await prisma.specBOM.update({ where: { id: existing.id }, data: { items: lines } });
        bomsRewritten++;
      } else {
        await prisma.specBOM.create({ data: { factoryId, refType: "DESIGN", refId: design.id, items: lines } });
        bomsWritten++;
      }
    }
    console.log(`  = BOM ${family}: ${lines.length} lines applied to ${names.length} designs`);
  }
  if (missingItems.size > 0) console.log(`  ! unresolved BOM items: ${[...missingItems].join(", ")}`);
  if (thinBoms.length > 0) {
    console.log(`  ! kept existing thin BOM(s): ${thinBoms.join(", ")} — re-run with --force to replace`);
  }

  // ---- Summary -------------------------------------------------------------
  const [designCount, bomCount, itemCount, lowStock] = await Promise.all([
    prisma.design.count({ where: { factoryId } }),
    prisma.specBOM.count({ where: { factoryId, refType: "DESIGN" } }),
    prisma.itemMaster.count({ where: { factoryId } }),
    prisma.itemMaster.findMany({ where: { factoryId }, select: { name: true, minStockLevel: true, binBalances: { select: { stockAvailable: true } } } }),
  ]);
  const stillLow = lowStock.filter((i) => i.binBalances.reduce((s, b) => s + b.stockAvailable, 0) < i.minStockLevel);
  console.log(`\nDone. designs=+${designsCreated} moved=${designsMoved} items=+${itemsCreated} receipts=+${receipts} specBOMs=+${bomsWritten}${bomsRewritten ? ` rewritten=${bomsRewritten}` : ""}`);
  console.log(`  totals: designs=${designCount} designBOMs=${bomCount} items=${itemCount} lowStock=${stillLow.length}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
