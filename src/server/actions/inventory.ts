"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { ADJUSTMENT_TYPES } from "@/lib/inventory-constants";
import { STOCK_STATUS_FIELD, type StockStatus } from "@/lib/stock-status";
import { SPEC_SUMMARY_INCLUDE, specSummary, loadRefLabels } from "@/server/queries/spec";
import { ensureDefaultBin } from "@/server/internal/stockMovements";

// issueMaterialsForWorkOrder and receiveFinishedGoods deliberately are NOT
// re-exported from here: re-exporting them from a "use server" module would
// publish them as endpoints again, which is the whole thing the move avoided.
// Their callers import them from @/server/internal/stockMovements.

export async function dispatchOrder(orderId: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId, factoryId: owner.factoryId },
      include: { plans: true }
    });

    if (!order) return { error: "Order not found" };

    // Check if all plans are COMPLETED
    const allCompleted = order.plans.every(p => p.status === "COMPLETED");
    if (!allCompleted) {
      return { error: "Cannot dispatch: Not all production plans are completed." };
    }

    await prisma.salesOrder.update({
      where: { id: orderId },
      data: { status: "DISPATCHED" }
    });

    revalidatePath("/owner/inventory");
    revalidatePath("/owner/dashboard");
    revalidatePath("/owner/production");
    return { success: true };
  } catch (error) {
    console.error("Error dispatching order:", error);
    return { error: "Failed to dispatch order" };
  }
}

export async function getMaterials() {
  const user = await getOwnerUser();
  if (!user) return [];
  const groupIds = await stockableGroupIds(user.factoryId);
  return prisma.itemMaster.findMany({
    where: { factoryId: user.factoryId, groupId: { in: [...groupIds] } },
    orderBy: { name: "asc" },
  });
}

// The group ids whose items are physical stock: everything under the seeded Raw
// Material and Semi-Finished roots (fabric, foam, thread, sub-assemblies). Their
// descendants are included; reference categories that happen to be RAW_MATERIAL
// typed — Vehicles/Brands/Models, Designs, Colours — live under other roots and
// are excluded, so brands and car models stop appearing as "stock".
async function stockableGroupIds(factoryId: string): Promise<Set<string>> {
  const groups = await prisma.itemGroup.findMany({
    where: { factoryId },
    select: { id: true, parentId: true, name: true, shortCode: true, itemType: true },
  });
  const isStockRoot = (g: (typeof groups)[number]) =>
    !g.parentId &&
    (["RM", "SF"].includes(g.shortCode ?? "") ||
      ["Raw Material", "Semi-Finished"].includes(g.name)) &&
    (g.itemType === "RAW_MATERIAL" || g.itemType === "SEMI_FINISHED");
  const childrenByParent = new Map<string, string[]>();
  for (const g of groups) {
    if (!g.parentId) continue;
    const list = childrenByParent.get(g.parentId) ?? [];
    list.push(g.id);
    childrenByParent.set(g.parentId, list);
  }
  const set = new Set<string>();
  const stack = groups.filter(isStockRoot).map((g) => g.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (set.has(id)) continue;
    set.add(id);
    for (const c of childrenByParent.get(id) ?? []) stack.push(c);
  }
  return set;
}

export async function getWarehouses() {
  const user = await getOwnerUser();
  if (!user) return [];
  return prisma.warehouse.findMany({ where: { factoryId: user.factoryId } });
}

export async function createStockEntry(data: {
  transactionType: "RECEIPT" | "ISSUE" | "TRANSFER" | "ADJUSTMENT";
  warehouseId: string;
  materialId?: string;
  batchNumber?: string;
  quantityChange: number;
  referenceDocType?: string;
  referenceDocId?: string;
}) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  // Stock moves against an ItemMaster row directly now.
  const itemId = data.materialId ?? null;
  if (!itemId) throw new Error("A material item is required");

  // Cutting issues the calculated quantity and no more. The requirement comes
  // from CAD (design consumption + BOM), materialised as this work order's
  // reservations; anything beyond it is real over-consumption and has to go
  // through adjustStock, which forces a type and a mandatory remark rather than
  // quietly inflating the issue.
  if (data.transactionType === "ISSUE" && data.referenceDocType === "WORK_ORDER" && data.referenceDocId) {
    const [reserved, issued] = await Promise.all([
      prisma.materialReservation.aggregate({
        where: { factoryId: user.factoryId, workOrderId: data.referenceDocId, itemId },
        _sum: { quantity: true },
      }),
      prisma.stockLedgerEntry.aggregate({
        where: {
          factoryId: user.factoryId,
          transactionType: "ISSUE",
          referenceDocType: "WORK_ORDER",
          referenceDocId: data.referenceDocId,
          itemId,
        },
        _sum: { quantityChange: true },
      }),
    ]);

    const allowed = reserved._sum.quantity ?? 0;
    if (allowed > 0) {
      const alreadyIssued = Math.abs(issued._sum.quantityChange ?? 0);
      const requested = Math.abs(data.quantityChange);
      const remaining = allowed - alreadyIssued;
      if (requested > remaining + 1e-6) {
        throw new Error(
          `Calculated requirement for this work order is ${round2(allowed)}; ${round2(alreadyIssued)} already issued, ` +
            `so only ${round2(Math.max(remaining, 0))} remains. Record the excess as a stock adjustment with a reason.`
        );
      }
    }
  }

  const bin = await ensureDefaultBin(user.factoryId, data.warehouseId);

  await prisma.stockLedgerEntry.create({
    data: {
      factoryId: user.factoryId,
      transactionType: data.transactionType,
      itemId,
      binId: bin.id,
      quantityChange: data.quantityChange,
      valuationRate: 0,
      totalValue: 0,
      batchNumber: data.batchNumber || null,
      referenceDocType: data.referenceDocType,
      referenceDocId: data.referenceDocId,
    },
  });

  // Keep the bucket balance in step with the ledger, otherwise available stock
  // drifts away from what the ledger says and QC-hold cannot be trusted.
  await prisma.binBalance.upsert({
    where: { itemId_binId: { itemId, binId: bin.id } },
    update: { stockAvailable: { increment: data.quantityChange } },
    create: { factoryId: user.factoryId, itemId, binId: bin.id, stockAvailable: data.quantityChange },
  });

  revalidatePath("/owner/inventory");
}

export async function getStockLedger() {
  const user = await getOwnerUser();
  if (!user) return [];

  const entries = await prisma.stockLedgerEntry.findMany({
    where: { factoryId: user.factoryId },
    include: {
      item: true,
      bin: { include: { shelf: { include: { rack: { include: { zone: { include: { warehouse: true } } } } } } } },
    },
    orderBy: { createdAt: 'desc' }
  });

  // Legacy shape: material/warehouse at the top level.
  return entries.map((entry) => ({
    ...entry,
    material: entry.item,
    productVariant: null,
    batch: null,
    warehouse: entry.bin.shelf.rack.zone.warehouse,
  }));
}

// Manual stock adjustment: signed quantity change against a material in a
// warehouse, with a mandatory reason + remark. Writes an ADJUSTMENT ledger
// entry, moves the bin balance, and records an audit-log trail.
export async function adjustStock(data: {
  materialId: string;
  warehouseId: string;
  quantityChange: number; // signed: negative removes stock
  adjustmentType: string;
  remark: string;
}) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const remark = data.remark?.trim();
  if (!remark) return { error: "A remark is required for every adjustment." };
  if (!data.materialId) return { error: "Select a material." };
  if (!data.warehouseId) return { error: "Select a warehouse." };
  const qty = Number(data.quantityChange);
  if (!qty || Number.isNaN(qty)) return { error: "Enter a non-zero adjustment quantity." };
  const validType = ADJUSTMENT_TYPES.some((t) => t.value === data.adjustmentType);
  if (!validType) return { error: "Select an adjustment type." };

  const item = await prisma.itemMaster.findFirst({ where: { id: data.materialId, factoryId: user.factoryId }, select: { id: true, name: true } });
  if (!item) return { error: "Material not found." };

  const bin = await ensureDefaultBin(user.factoryId, data.warehouseId);

  await prisma.$transaction(async (tx) => {
    await tx.stockLedgerEntry.create({
      data: {
        factoryId: user.factoryId,
        transactionType: "ADJUSTMENT",
        itemId: item.id,
        binId: bin.id,
        quantityChange: qty,
        valuationRate: 0,
        totalValue: 0,
        adjustmentType: data.adjustmentType,
        notes: remark,
        createdById: user.id,
        referenceDocType: "StockAdjustment",
      },
    });
    await tx.binBalance.upsert({
      where: { itemId_binId: { itemId: item.id, binId: bin.id } },
      update: { stockAvailable: { increment: qty } },
      create: { factoryId: user.factoryId, itemId: item.id, binId: bin.id, stockAvailable: qty },
    });
    const typeLabel = ADJUSTMENT_TYPES.find((t) => t.value === data.adjustmentType)?.label ?? data.adjustmentType;
    await tx.auditLog.create({
      data: {
        factoryId: user.factoryId,
        actorUserId: user.id,
        action: `${user.name} adjusted ${item.name} by ${qty > 0 ? "+" : ""}${qty} (${typeLabel})`,
        entityType: "StockLedgerEntry",
        entityId: item.id,
        metadata: { adjustmentType: data.adjustmentType, quantityChange: qty, remark, warehouseId: data.warehouseId },
      },
    });
  }, { timeout: 30000, maxWait: 10000 });

  revalidatePath("/owner/inventory");
  return { success: true };
}

// Manual-adjustment history (audit trail) for the Inventory adjustments tab.
export async function getStockAdjustments() {
  const user = await getOwnerUser();
  if (!user) return [];
  const entries = await prisma.stockLedgerEntry.findMany({
    where: { factoryId: user.factoryId, transactionType: "ADJUSTMENT", referenceDocType: "StockAdjustment" },
    include: {
      item: { select: { name: true, defaultUOM: true } },
      bin: { include: { shelf: { include: { rack: { include: { zone: { include: { warehouse: { select: { name: true } } } } } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const userIds = [...new Set(entries.map((e) => e.createdById).filter(Boolean) as string[])];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return entries.map((e) => ({
    id: e.id,
    materialName: e.item.name,
    uom: e.item.defaultUOM,
    warehouseName: e.bin.shelf.rack.zone.warehouse.name,
    quantityChange: e.quantityChange,
    adjustmentType: e.adjustmentType,
    remark: e.notes,
    by: e.createdById ? nameById.get(e.createdById) ?? "—" : "—",
    at: e.createdAt,
  }));
}

// Retained as an empty stub: the inventory page still requests it, but the
// legacy ProductVariant catalogue is retired and the UI no longer reads it.
export async function getProductVariants(): Promise<never[]> {
  return [];
}

// ==========================================
// Production material issuance (auto-filled from the BOM configured in
// Master Data) + finished-goods receipt on QC approval.
// ==========================================

// Aggregated view for the five-tab inventory screen.
export async function getInventoryOverview() {
  const user = await getOwnerUser();
  if (!user) return null;
  const factoryId = user.factoryId;

  const [rawMaterials, reservations, balances, warehouses, activeWorkOrders] = await Promise.all([
    prisma.itemMaster.findMany({
      // Physical stock only — items under the Raw Material and Semi-Finished
      // roots. Reference categories (Vehicles/Brands/Models, Designs, Colours)
      // are RAW_MATERIAL-typed too but are not stock, so they are excluded by
      // group rather than by type.
      where: {
        factoryId,
        groupId: { in: [...(await stockableGroupIds(factoryId))] },
      },
      include: {
        group: { select: { name: true } },
        specValues: { include: SPEC_SUMMARY_INCLUDE },
        // Stock is held in the item's own unit, but the floor counts rolls and
        // bags. Carrying the conversion lets a row say both.
        conversions: { select: { fromUOM: true, toUOM: true, conversionFactor: true } },
      },
      orderBy: [{ itemType: "asc" }, { name: "asc" }],
    }),
    prisma.materialReservation.findMany({
      where: { factoryId, status: "ACTIVE" },
      include: {
        item: true,
        workOrder: {
          include: {
            productionPlan: {
              include: {
                salesOrder: true,
                // Three joins out to Product for a name the item already carries —
            // and Product is empty, so the WIP column read "—" on every row.
            blueprintVersion: {
              include: {
                blueprint: {
                  include: { item: { select: { id: true, name: true, group: { select: { name: true } } } } },
                },
              },
            },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.binBalance.findMany({
      where: { factoryId },
      include: {
        item: { include: { specValues: { include: SPEC_SUMMARY_INCLUDE }, conversions: { select: { fromUOM: true, toUOM: true, conversionFactor: true } } } },
        bin: { include: { shelf: { include: { rack: { include: { zone: { include: { warehouse: true } } } } } } } },
      },
    }),
    prisma.warehouse.findMany({ where: { factoryId }, orderBy: { name: "asc" } }),
    // Ongoing productions: every work order that hasn't finished yet, so the
    // Production tab reflects the floor even when no BOM materials were issued.
    prisma.workOrder.findMany({
      where: { factoryId, status: { notIn: ["COMPLETED", "CANCELLED", "DRAFT"] } },
      include: {
        reservations: { where: { status: "ACTIVE" }, include: { item: true } },
        productionPlan: {
          include: {
            salesOrder: { include: { customer: true } },
            // Three joins out to Product for a name the item already carries —
            // and Product is empty, so the WIP column read "—" on every row.
            blueprintVersion: {
              include: {
                blueprint: {
                  include: { item: { select: { id: true, name: true, group: { select: { name: true } } } } },
                },
              },
            },
          },
        },
      },
      orderBy: { startDate: "desc" },
    }),
  ]);

  // Net raw-material stock from the ledger (covers items without bin balances)
  const ledgerSums = await prisma.stockLedgerEntry.groupBy({
    by: ["itemId"],
    where: { factoryId },
    _sum: { quantityChange: true },
  });
  const netByItem = new Map(ledgerSums.map((l) => [l.itemId, l._sum.quantityChange ?? 0]));

  // Spec summaries so a stock row says what the item actually is, rather than
  // leaving the reader to infer it from a name.
  const stockRefIds = [
    ...rawMaterials.flatMap((m) => m.specValues.map((v) => v.valueRefId)),
    ...balances.flatMap((b) => b.item.specValues.map((v) => v.valueRefId)),
  ].filter((x): x is string => Boolean(x));
  const stockRefLabels = await loadRefLabels(stockRefIds);

  const rawWithStock = rawMaterials.map((m) => {
    const netStock = netByItem.get(m.id) ?? 0;
    // How many of the purchase unit that quantity is — 150 m shown as 3 rolls.
    const toSecondary = m.secondaryUOM
      ? m.conversions.find((c) => c.fromUOM === m.secondaryUOM && c.toUOM === m.defaultUOM)
      : null;
    return {
      ...m,
      netStock,
      groupName: m.group?.name ?? null,
      spec: specSummary(m.specValues, stockRefLabels),
      secondaryQty:
        toSecondary && toSecondary.conversionFactor > 0
          ? netStock / toSecondary.conversionFactor
          : null,
    };
  });

  const locationBalances = balances
    .filter((b) => b.stockAvailable !== 0)
    .map((b) => {
      const toSecondary = b.item.secondaryUOM
        ? b.item.conversions.find((c) => c.fromUOM === b.item.secondaryUOM && c.toUOM === b.item.defaultUOM)
        : null;
      return {
        id: b.id,
        itemCode: b.item.itemCode,
        itemSpec: specSummary(b.item.specValues, stockRefLabels),
        itemName: b.item.name,
        sku: b.item.sku,
        itemType: b.item.itemType,
        quantity: b.stockAvailable,
        uom: b.item.defaultUOM,
        secondaryQty:
          toSecondary && toSecondary.conversionFactor > 0
            ? b.stockAvailable / toSecondary.conversionFactor
            : null,
        secondaryUOM: b.item.secondaryUOM,
        warehouseId: b.bin.shelf.rack.zone.warehouse.id,
        warehouseName: b.bin.shelf.rack.zone.warehouse.name,
        warehouseKind: (b.bin.shelf.rack.zone.warehouse as any).kind ?? "WAREHOUSE",
      };
    });

  const ongoingProductions = activeWorkOrders.map((wo) => ({
    id: wo.id,
    woNumber: wo.woNumber,
    status: wo.status,
    targetQty: wo.targetQty,
    startDate: wo.startDate,
    customerName: wo.productionPlan?.salesOrder?.customer?.name ?? "—",
    soNumber: wo.productionPlan?.salesOrder?.soNumber ?? "—",
    productName: wo.productionPlan?.blueprintVersion?.blueprint?.item?.group?.name ?? "—",
    variantName: wo.productionPlan?.blueprintVersion?.blueprint?.item?.name ?? "",
    materialsIssued: wo.reservations.length,
  }));

  // ---- Summary + valuation (Milestone 3.5 / 3.6) ----
  // Latest known unit cost per item (most recent receipt rate).
  const receiptRates = await prisma.stockLedgerEntry.findMany({
    where: { factoryId, transactionType: "RECEIPT", valuationRate: { gt: 0 } },
    select: { itemId: true, valuationRate: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const rateByItem = new Map<string, number>();
  for (const r of receiptRates) if (!rateByItem.has(r.itemId)) rateByItem.set(r.itemId, r.valuationRate);

  const itemTypeById = new Map<string, string>();
  for (const b of balances) itemTypeById.set(b.itemId, b.item.itemType);
  for (const m of rawMaterials) itemTypeById.set(m.id, m.itemType);

  // Net stock per item straight from the ledger, valued at latest rate.
  let rawValue = 0, fgValue = 0;
  for (const [itemId, net] of netByItem.entries()) {
    if (net <= 0) continue;
    const value = net * (rateByItem.get(itemId) ?? 0);
    const type = itemTypeById.get(itemId);
    if (type === "FINISHED_PRODUCT") fgValue += value;
    else rawValue += value;
  }

  const reservedQty = reservations.reduce((s, r) => s + r.quantity, 0);

  // Today's inward / outward movement counts and quantities.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayEntries = await prisma.stockLedgerEntry.findMany({
    where: { factoryId, createdAt: { gte: startOfDay } },
    select: { quantityChange: true },
  });
  let todayInward = 0, todayOutward = 0;
  for (const e of todayEntries) {
    if (e.quantityChange > 0) todayInward += e.quantityChange;
    else todayOutward += Math.abs(e.quantityChange);
  }

  const lowStock = rawWithStock
    .filter((m) => m.minStockLevel > 0 && m.netStock <= m.minStockLevel)
    .map((m) => ({ id: m.id, name: m.name, netStock: m.netStock, minStockLevel: m.minStockLevel, uom: m.defaultUOM, secondaryQty: m.secondaryQty, secondaryUOM: m.secondaryUOM }));

  const valuation = rawWithStock
    .filter((m) => m.netStock !== 0)
    .map((m) => ({
      id: m.id,
      name: m.name,
      sku: m.sku,
      uom: m.defaultUOM,
      netStock: m.netStock,
      rate: rateByItem.get(m.id) ?? 0,
      value: m.netStock * (rateByItem.get(m.id) ?? 0),
      secondaryQty: m.secondaryQty,
      secondaryUOM: m.secondaryUOM,
    }))
    .sort((a, b) => b.value - a.value);

  const summary = {
    rawValue,
    fgValue,
    reservedQty,
    todayInward,
    todayOutward,
    lowStockCount: lowStock.length,
    lowStock,
  };

  return { rawMaterials: rawWithStock, reservations, locationBalances, warehouses, ongoingProductions, summary, valuation };
}

// Material variance (Milestone 3.6): BOM-expected vs actually-issued material per
// work order. Expected = BOM qty × target × (1 + waste). Issued = ACTIVE/CONSUMED
// reservation quantity for the work order.
export async function getMaterialVariance() {
  const user = await getOwnerUser();
  if (!user) return [];
  const factoryId = user.factoryId;

  const workOrders = await prisma.workOrder.findMany({
    where: { factoryId, reservations: { some: {} } },
    include: {
      reservations: { include: { item: true } },
      productionPlan: {
        include: {
          salesOrder: true,
          blueprintVersion: {
            include: {
              blueprint: { include: { item: { select: { id: true, name: true, group: { select: { name: true } } } } } },
              bom: { include: { items: { include: { item: true } } } },
            },
          },
        },
      },
    },
    orderBy: { startDate: "desc" },
    take: 100,
  });

  return workOrders.map((wo) => {
    const target = wo.targetQty || 0;
    const bomItems = wo.productionPlan?.blueprintVersion?.bom?.items ?? [];
    const expectedByItem = new Map<string, { name: string; expected: number }>();
    for (const bi of bomItems) {
      const expected = bi.quantity * target * (1 + bi.wastePercent / 100);
      expectedByItem.set(bi.itemId, { name: bi.item.name, expected });
    }
    const issuedByItem = new Map<string, number>();
    for (const r of wo.reservations) issuedByItem.set(r.itemId, (issuedByItem.get(r.itemId) ?? 0) + r.quantity);

    const itemIds = new Set<string>([...expectedByItem.keys(), ...issuedByItem.keys()]);
    const lines = Array.from(itemIds).map((id) => {
      const exp = expectedByItem.get(id);
      const issued = issuedByItem.get(id) ?? 0;
      const expected = exp?.expected ?? 0;
      const name = exp?.name ?? wo.reservations.find((r) => r.itemId === id)?.item.name ?? "Material";
      return { itemId: id, name, expected, issued, variance: issued - expected };
    });

    return {
      workOrderId: wo.id,
      woNumber: wo.woNumber,
      soNumber: wo.productionPlan?.salesOrder?.soNumber ?? "—",
      productName: wo.productionPlan?.blueprintVersion?.blueprint?.item?.name ?? "—",
      targetQty: target,
      lines,
      totalVariance: lines.reduce((s, l) => s + l.variance, 0),
    };
  });
}

// Local helper (not exported — "use server" files may only export async functions).
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// =======================
// Batch traceability
// =======================

// Remaining quantity per batch, with the provenance the floor needs to decide
// which batch to consume: supplier, first receipt date, and QC state. Batches
// are FIFO-ordered (oldest receipt first), which is the default issue order.
export async function getItemBatches(itemId?: string) {
  const user = await getOwnerUser();
  if (!user) return [];

  const entries = await prisma.stockLedgerEntry.findMany({
    where: {
      factoryId: user.factoryId,
      batchNumber: { not: null },
      ...(itemId ? { itemId } : {}),
    },
    select: {
      itemId: true,
      batchNumber: true,
      quantityChange: true,
      valuationRate: true,
      supplierId: true,
      manufacturedAt: true,
      stockStatus: true,
      createdAt: true,
      item: { select: { name: true, sku: true, defaultUOM: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  type Row = {
    key: string;
    itemId: string;
    itemName: string;
    sku: string;
    uom: string;
    batchNumber: string;
    remaining: number;
    received: number;
    rate: number;
    supplierId: string | null;
    manufacturedAt: Date | null;
    stockStatus: string;
    firstReceivedAt: Date;
  };

  const byBatch = new Map<string, Row>();
  for (const e of entries) {
    const key = `${e.itemId}::${e.batchNumber}`;
    const existing = byBatch.get(key);
    if (!existing) {
      byBatch.set(key, {
        key,
        itemId: e.itemId,
        itemName: e.item.name,
        sku: e.item.sku,
        uom: e.item.defaultUOM,
        batchNumber: e.batchNumber!,
        remaining: e.quantityChange,
        received: e.quantityChange > 0 ? e.quantityChange : 0,
        rate: e.valuationRate,
        supplierId: e.supplierId,
        manufacturedAt: e.manufacturedAt,
        stockStatus: e.stockStatus ?? "AVAILABLE",
        firstReceivedAt: e.createdAt,
      });
      continue;
    }
    existing.remaining += e.quantityChange;
    if (e.quantityChange > 0) existing.received += e.quantityChange;
    if (e.supplierId) existing.supplierId = e.supplierId;
    if (e.manufacturedAt) existing.manufacturedAt = e.manufacturedAt;
    // The latest QC decision on the batch wins.
    if (e.stockStatus) existing.stockStatus = e.stockStatus;
  }

  const rows = [...byBatch.values()];
  const supplierIds = [...new Set(rows.map((r) => r.supplierId).filter(Boolean))] as string[];
  const suppliers = supplierIds.length
    ? await prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } })
    : [];
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));

  return rows
    .map((r) => ({ ...r, supplierName: r.supplierId ? supplierName.get(r.supplierId) ?? null : null }))
    .sort((a, b) => a.firstReceivedAt.getTime() - b.firstReceivedAt.getTime());
}

// Moves quantity between the available / QC-hold / rejected buckets. This is a
// status change, not a stock movement: the total on the shelf is unchanged, so
// the ledger entry nets to zero and only the bucket split moves.
export async function setStockQcStatus(data: {
  materialId: string;
  warehouseId: string;
  quantity: number;
  from: StockStatus;
  to: StockStatus;
  remark: string;
}) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const remark = data.remark?.trim();
  if (!remark) return { error: "A remark is required when changing QC status." };
  if (!data.materialId) return { error: "Select a material." };
  if (!(data.quantity > 0)) return { error: "Quantity must be greater than zero." };
  if (data.from === data.to) return { error: "Pick a different target status." };

  const fromField = STOCK_STATUS_FIELD[data.from];
  const toField = STOCK_STATUS_FIELD[data.to];
  if (!fromField || !toField) return { error: "Unknown stock status." };

  const bin = await ensureDefaultBin(user.factoryId, data.warehouseId);

  const balance = await prisma.binBalance.findUnique({
    where: { itemId_binId: { itemId: data.materialId, binId: bin.id } },
  });
  const availableInSource = (balance?.[fromField] as number | undefined) ?? 0;
  if (data.quantity > availableInSource + 1e-6) {
    return { error: `Only ${round2(availableInSource)} is in ${data.from.replace("_", " ").toLowerCase()}.` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.binBalance.upsert({
      where: { itemId_binId: { itemId: data.materialId, binId: bin.id } },
      update: {
        [fromField]: { decrement: data.quantity },
        [toField]: { increment: data.quantity },
      } as any,
      create: {
        factoryId: user.factoryId,
        itemId: data.materialId,
        binId: bin.id,
        [toField]: data.quantity,
        [fromField]: -data.quantity,
      } as any,
    });

    await tx.stockLedgerEntry.create({
      data: {
        factoryId: user.factoryId,
        transactionType: "ADJUSTMENT",
        itemId: data.materialId,
        binId: bin.id,
        // Net zero: the goods did not move, only their disposition.
        quantityChange: 0,
        valuationRate: 0,
        totalValue: 0,
        adjustmentType: "QC_STATUS",
        stockStatus: data.to,
        notes: `${data.from} -> ${data.to} (${data.quantity}): ${remark}`,
        createdById: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        factoryId: user.factoryId,
        actorUserId: user.id,
        action: `Stock moved ${data.from} -> ${data.to}`,
        entityType: "ItemMaster",
        entityId: data.materialId,
        metadata: { quantity: data.quantity, from: data.from, to: data.to, remark },
      },
    });
  });

  revalidatePath("/owner/inventory");
  return { success: true };
}
