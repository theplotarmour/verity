"use server";

import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getOwnerUser } from "@/lib/server/owner";
import { SPEC_SUMMARY_INCLUDE, specSummary, loadRefLabels } from "@/server/queries/spec";

export async function createPurchaseOrder(data: {
  supplierId: string;
  items: { materialId: string, quantity: number, rate: number }[];
  expectedDate?: string;
}) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  await guardModuleWrite("procurement");

  const poCount = await prisma.purchaseOrder.count({ where: { factoryId: user.factoryId } });

  await prisma.purchaseOrder.create({
    data: {
      factoryId: user.factoryId,
      poNumber: `PO-${String(poCount + 1).padStart(5, "0")}-${Date.now().toString(36).toUpperCase()}`,
      supplierId: data.supplierId,
      status: "SUBMITTED",
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      items: {
        create: data.items.map(i => ({
          materialId: i.materialId,
          quantity: i.quantity,
          rate: i.rate
        }))
      }
    }
  });

  revalidatePath("/owner/purchase");
}

// Vendor return: sends materials back to the supplier. Records a RET-numbered
// order for the procurement history and writes negative stock-ledger entries so
// raw-material stock drops accordingly.
export async function returnMaterials(data: {
  supplierId: string;
  items: { materialId: string; quantity: number; rate: number }[];
  reason?: string;
}) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");
  // Write, not Action: this books a RETURNED purchase order and writes negative
  // stock-ledger entries. It was tagged as a read, which would have let a
  // read-only workspace move stock.
  await guardModuleWrite("procurement");
  const factoryId = user.factoryId;

  if (!data.items.length || data.items.some((i) => !i.materialId || i.quantity <= 0)) {
    throw new Error("Add at least one material with a quantity to return");
  }

  const retCount = await prisma.purchaseOrder.count({
    where: { factoryId, status: "RETURNED" },
  });

  const returnOrder = await prisma.purchaseOrder.create({
    data: {
      factoryId,
      poNumber: `RET-${String(retCount + 1).padStart(5, "0")}-${Date.now().toString(36).toUpperCase()}`,
      supplierId: data.supplierId,
      status: "RETURNED",
      items: {
        create: data.items.map((i) => ({
          materialId: i.materialId,
          quantity: i.quantity,
          rate: i.rate,
        })),
      },
    },
  });

  // Default warehouse + Default bin chain (same convention as the inventory engine)
  let warehouse = await prisma.warehouse.findFirst({
    where: { factoryId, kind: "WAREHOUSE" },
    orderBy: { createdAt: "asc" },
  });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({ data: { factoryId, name: "Main Warehouse", kind: "WAREHOUSE" } });
  }
  let zone = await prisma.warehouseZone.findFirst({ where: { warehouseId: warehouse.id, name: "Default" } });
  if (!zone) zone = await prisma.warehouseZone.create({ data: { factoryId, warehouseId: warehouse.id, name: "Default" } });
  let rack = await prisma.warehouseRack.findFirst({ where: { zoneId: zone.id, name: "Default" } });
  if (!rack) rack = await prisma.warehouseRack.create({ data: { factoryId, zoneId: zone.id, name: "Default" } });
  let shelf = await prisma.warehouseShelf.findFirst({ where: { rackId: rack.id, name: "Default" } });
  if (!shelf) shelf = await prisma.warehouseShelf.create({ data: { factoryId, rackId: rack.id, name: "Default" } });
  let bin = await prisma.warehouseBin.findFirst({ where: { shelfId: shelf.id, name: "Default" } });
  if (!bin) bin = await prisma.warehouseBin.create({ data: { factoryId, shelfId: shelf.id, name: "Default" } });

  for (const item of data.items) {
    await prisma.stockLedgerEntry.create({
      data: {
        factoryId,
        transactionType: "ISSUE",
        itemId: item.materialId,
        binId: bin.id,
        quantityChange: -Math.abs(item.quantity),
        valuationRate: item.rate || 0,
        totalValue: -Math.abs(item.quantity) * (item.rate || 0),
        referenceDocType: "VENDOR_RETURN",
        referenceDocId: returnOrder.id,
      },
    });
    await prisma.binBalance.upsert({
      where: { itemId_binId: { itemId: item.materialId, binId: bin.id } },
      update: { stockAvailable: { decrement: Math.abs(item.quantity) } },
      create: { factoryId, itemId: item.materialId, binId: bin.id, stockAvailable: -Math.abs(item.quantity) },
    });
  }

  revalidatePath("/owner/purchase");
  revalidatePath("/owner/inventory");
  return { success: true, returnNumber: returnOrder.poNumber };
}

export async function getPurchaseOrders() {
  await guardModuleAction("procurement");
  const user = await getOwnerUser();
  if (!user) return [];
  
  const orders = await prisma.purchaseOrder.findMany({
    where: { factoryId: user.factoryId },
    include: {
      supplier: true,
      items: {
        include: {
          material: {
            include: {
              group: { select: { name: true } },
              specValues: { include: SPEC_SUMMARY_INCLUDE },
              conversions: true,
            },
          },
        },
      },
    },
    orderBy: { orderDate: 'desc' }
  });

  // A vendor slip has to say what was ordered, not just its name — the supplier
  // cannot ship "Leatherite" without the GSM and width.
  const refIds = orders.flatMap((o) =>
    o.items.flatMap((i) => i.material.specValues.map((v) => v.valueRefId))
  ).filter((x): x is string => Boolean(x));
  const refLabels = await loadRefLabels(refIds);

  return orders.map((o) => ({
    ...o,
    items: o.items.map((i) => ({
      ...i,
      material: {
        ...i.material,
        groupName: i.material.group?.name ?? null,
        spec: specSummary(i.material.specValues, refLabels),
      },
    })),
  }));
}

export async function getSuppliers() {
  await guardModuleAction("procurement");
  const user = await getOwnerUser();
  if (!user) return [];
  return prisma.supplier.findMany({ where: { factoryId: user.factoryId }, orderBy: { name: "asc" } });
}

type SupplierInput = {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst?: string;
  pan?: string;
  bankName?: string;
  bankAccount?: string;
  paymentTerms?: string;
  leadTimeDays?: number | null;
};

export async function createSupplier(data: SupplierInput) {
  await guardModuleWrite("procurement");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!data.name?.trim()) return { error: "Name is required" };
  const s = await prisma.supplier.create({ data: { factoryId: user.factoryId, ...data, name: data.name.trim() } });
  revalidatePath("/owner/purchase");
  return { success: true, id: s.id };
}

export async function updateSupplier(id: string, data: SupplierInput) {
  await guardModuleWrite("procurement");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const existing = await prisma.supplier.findFirst({ where: { id, factoryId: user.factoryId } });
  if (!existing) return { error: "Supplier not found" };
  await prisma.supplier.update({ where: { id }, data: { ...data, name: data.name?.trim() || existing.name } });
  revalidatePath("/owner/purchase");
  return { success: true };
}

export async function deleteSupplier(id: string) {
  await guardModuleWrite("procurement");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const poCount = await prisma.purchaseOrder.count({ where: { supplierId: id, factoryId: user.factoryId } });
  if (poCount > 0) return { error: "Supplier has purchase orders and cannot be deleted" };
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/owner/purchase");
  return { success: true };
}

// Full supplier profile + derived performance for the vendor drawer.
export async function getSupplierDetail(id: string) {
  await guardModuleAction("procurement");
  const user = await getOwnerUser();
  if (!user) return null;
  const factoryId = user.factoryId;

  const supplier = await prisma.supplier.findFirst({ where: { id, factoryId } });
  if (!supplier) return null;

  const [orders, receipts] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { supplierId: id, factoryId },
      include: { items: { include: { material: true } } },
      orderBy: { orderDate: "desc" },
    }),
    prisma.purchaseReceipt.findMany({ where: { supplierId: id, factoryId }, orderBy: { receiptDate: "asc" } }),
  ]);

  const purchaseOrders = orders.filter((o) => !o.poNumber.startsWith("RET-"));
  const returns = orders.filter((o) => o.poNumber.startsWith("RET-"));

  const totalSpend = purchaseOrders
    .filter((o) => o.status === "COMPLETED" || o.status === "PARTIALLY_RECEIVED")
    .reduce((s, o) => s + o.items.reduce((a, i) => a + i.receivedQty * i.rate, 0), 0);

  // Materials supplied + price history (latest rate first per material)
  const priceMap = new Map<string, { name: string; history: { poNumber: string; date: Date; rate: number }[] }>();
  for (const o of purchaseOrders) {
    for (const i of o.items) {
      if (!priceMap.has(i.materialId)) priceMap.set(i.materialId, { name: i.material.name, history: [] });
      priceMap.get(i.materialId)!.history.push({ poNumber: o.poNumber, date: o.orderDate, rate: i.rate });
    }
  }
  const materials = Array.from(priceMap.entries()).map(([materialId, v]) => ({
    materialId,
    name: v.name,
    lastRate: v.history[0]?.rate ?? 0,
    history: v.history.slice(0, 8),
  }));

  // On-time %: a completed PO is on time if its last receipt landed within the
  // expected window (orderDate + leadTimeDays, default 7).
  const receiptByPo = new Map<string, Date>();
  for (const r of receipts) receiptByPo.set(r.purchaseOrderId, r.receiptDate); // ascending → keeps latest via overwrite
  const lead = supplier.leadTimeDays ?? 7;
  const completed = purchaseOrders.filter((o) => o.status === "COMPLETED");
  let onTime = 0, measured = 0;
  for (const o of completed) {
    const rec = receiptByPo.get(o.id);
    if (!rec) continue;
    measured++;
    const due = new Date(o.orderDate); due.setDate(due.getDate() + lead);
    if (rec <= due) onTime++;
  }
  const onTimePct = measured > 0 ? Math.round((onTime / measured) * 100) : null;

  return {
    supplier,
    stats: {
      poCount: purchaseOrders.length,
      completedCount: completed.length,
      openCount: purchaseOrders.filter((o) => ["SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED", "DRAFT"].includes(o.status)).length,
      totalSpend,
      onTimePct,
      returnCount: returns.length,
      returnValue: returns.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity * i.rate, 0), 0),
    },
    materials,
    recentOrders: purchaseOrders.slice(0, 8).map((o) => ({
      poNumber: o.poNumber,
      date: o.orderDate,
      status: o.status,
      value: o.items.reduce((a, i) => a + i.quantity * i.rate, 0),
    })),
  };
}

// Approve a submitted PO (Manager+ gate). SUBMITTED/DRAFT → APPROVED.
export async function approvePurchaseOrder(id: string) {
  await guardModuleAction("procurement");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  if (!["OWNER", "CO_OWNER", "MANAGER"].includes(user.role)) return { error: "Only a manager or owner can approve" };
  const po = await prisma.purchaseOrder.findFirst({ where: { id, factoryId: user.factoryId } });
  if (!po) return { error: "Purchase order not found" };
  if (!["SUBMITTED", "DRAFT"].includes(po.status)) return { error: "Only submitted orders can be approved" };
  await prisma.purchaseOrder.update({ where: { id }, data: { status: "APPROVED" } });
  await prisma.auditLog.create({
    data: { factoryId: user.factoryId, actorUserId: user.id, action: `Purchase order ${po.poNumber} approved`, entityType: "PurchaseOrder", entityId: po.id },
  });
  try {
    const { emitEvent, EVENTS, ownerRecipients } = await import("@/lib/server/events");
    await emitEvent({
      factoryId: user.factoryId,
      event: EVENTS.PO_APPROVED,
      recipients: (await ownerRecipients(user.factoryId)).filter((id) => id !== user.id),
      title: "Purchase order approved",
      message: `${po.poNumber} was approved and is ready to receive.`,
      linkUrl: "/owner/purchase",
      type: "SUCCESS",
    });
  } catch (e) { console.error("PO-approved event emit failed", e); }
  revalidatePath("/owner/purchase");
  return { success: true };
}

export async function updatePurchaseOrderStatus(id: string, status: string) {
  await guardModuleWrite("procurement");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await prisma.purchaseOrder.update({
    where: { id, factoryId: user.factoryId },
    data: { status },
  });
  revalidatePath("/owner/purchase");
  revalidatePath("/owner/inventory");
  return { success: true };
}

export async function deletePurchaseOrder(id: string) {
  await guardModuleWrite("procurement");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await prisma.purchaseOrder.delete({ where: { id, factoryId: user.factoryId } });
  revalidatePath("/owner/purchase");
  return { success: true };
}

export async function updatePurchaseOrder(id: string, data: {
  supplierId?: string;
  items?: { materialId: string; quantity: number; rate: number }[];
}) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("procurement");
  const po = await prisma.purchaseOrder.findFirst({ where: { id, factoryId: user.factoryId } });
  if (!po) return { error: "Purchase order not found" };
  if (po.status === "COMPLETED") return { error: "Delivered orders cannot be edited" };

  await prisma.$transaction(async (tx) => {
    if (data.supplierId) {
      await tx.purchaseOrder.update({ where: { id }, data: { supplierId: data.supplierId } });
    }
    if (data.items) {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      await tx.purchaseOrderItem.createMany({
        data: data.items.map((i) => ({ purchaseOrderId: id, materialId: i.materialId, quantity: i.quantity, rate: i.rate })),
      });
    }
  });
  revalidatePath("/owner/purchase");
  return { success: true };
}

// Ensure the factory's default raw-material bin (same chain inventory uses).
async function ensureRawBin(factoryId: string) {
  let warehouse = await prisma.warehouse.findFirst({ where: { factoryId, kind: "WAREHOUSE" }, orderBy: { createdAt: "asc" } });
  if (!warehouse) warehouse = await prisma.warehouse.create({ data: { factoryId, name: "Main Warehouse", kind: "WAREHOUSE" } });
  let zone = await prisma.warehouseZone.findFirst({ where: { warehouseId: warehouse.id, name: "Default" } });
  if (!zone) zone = await prisma.warehouseZone.create({ data: { factoryId, warehouseId: warehouse.id, name: "Default" } });
  let rack = await prisma.warehouseRack.findFirst({ where: { zoneId: zone.id, name: "Default" } });
  if (!rack) rack = await prisma.warehouseRack.create({ data: { factoryId, zoneId: zone.id, name: "Default" } });
  let shelf = await prisma.warehouseShelf.findFirst({ where: { rackId: rack.id, name: "Default" } });
  if (!shelf) shelf = await prisma.warehouseShelf.create({ data: { factoryId, rackId: rack.id, name: "Default" } });
  let bin = await prisma.warehouseBin.findFirst({ where: { shelfId: shelf.id, name: "Default" } });
  if (!bin) bin = await prisma.warehouseBin.create({ data: { factoryId, shelfId: shelf.id, name: "Default" } });
  return bin;
}

// GRN: receive specified quantities (per PO line) into raw-material stock with a
// real valuation rate and optional batch. Supports partial receipts — the PO
// moves to PARTIALLY_RECEIVED until every line is fully received (COMPLETED).
export async function receivePurchaseOrder(
  id: string,
  lines: {
    materialId: string;
    quantity: number;
    rate: number;
    batchNumber?: string;
    /**
     * The unit the quantity and rate are expressed in. Omit for the item's
     * stocking unit; pass its purchase unit to receive in rolls, boxes or bags.
     */
    unit?: string;
  }[],
) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("procurement");
  const factoryId = user.factoryId;

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, factoryId },
    include: { items: true },
  });
  if (!po) return { error: "Purchase order not found" };
  if (po.status === "COMPLETED") return { error: "Already fully received" };
  if (po.status === "CANCELLED") return { error: "Order was cancelled" };

  const entered = lines.filter((l) => l.quantity > 0);
  if (entered.length === 0) return { error: "Enter at least one received quantity" };

  // Stock is always held in the item's own unit. A receipt entered in the
  // purchase unit is converted here — including the rate, because 3 rolls at
  // ₹5000 a roll is 150 metres at ₹100 a metre, and valuing it at ₹5000 a metre
  // would overstate inventory fifty-fold.
  const items = await prisma.itemMaster.findMany({
    where: { factoryId, id: { in: entered.map((l) => l.materialId) } },
    select: {
      id: true,
      defaultUOM: true,
      secondaryUOM: true,
      conversions: { select: { fromUOM: true, toUOM: true, conversionFactor: true } },
    },
  });
  const byItem = new Map(items.map((i) => [i.id, i]));

  const received: typeof entered = [];
  for (const line of entered) {
    const item = byItem.get(line.materialId);
    const unit = line.unit?.trim().toUpperCase();
    if (!item || !unit || unit === item.defaultUOM) {
      received.push(line);
      continue;
    }
    const conversion = item.conversions.find(
      (c) => c.fromUOM === unit && c.toUOM === item.defaultUOM
    );
    if (!conversion || conversion.conversionFactor <= 0) {
      return {
        error: `No conversion from ${unit} to ${item.defaultUOM}. Set it on the item before receiving in ${unit}.`,
      };
    }
    received.push({
      ...line,
      quantity: line.quantity * conversion.conversionFactor,
      rate: line.rate / conversion.conversionFactor,
    });
  }

  const bin = await ensureRawBin(factoryId);
  const rcCount = await prisma.purchaseReceipt.count({ where: { factoryId } });

  await prisma.$transaction(async (tx) => {
    const receipt = await tx.purchaseReceipt.create({
      data: {
        factoryId,
        receiptNumber: `GRN-${String(rcCount + 1).padStart(5, "0")}-${Date.now().toString(36).toUpperCase()}`,
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        status: "SUBMITTED",
        receivedById: user.id,
        items: {
          create: received.map((l) => ({
            materialId: l.materialId,
            quantity: l.quantity,
            rate: l.rate,
            batchNumber: l.batchNumber || null,
          })),
        },
      },
    });

    for (const line of received) {
      await tx.stockLedgerEntry.create({
        data: {
          factoryId,
          transactionType: "RECEIPT",
          itemId: line.materialId,
          binId: bin.id,
          quantityChange: line.quantity,
          valuationRate: line.rate,
          totalValue: line.quantity * line.rate,
          batchNumber: line.batchNumber || null,
          // Batch provenance so a batch can be traced back to who supplied it.
          supplierId: po.supplierId,
          stockStatus: "AVAILABLE",
          referenceDocType: "PURCHASE_RECEIPT",
          referenceDocId: receipt.id,
        },
      });
      await tx.binBalance.upsert({
        where: { itemId_binId: { itemId: line.materialId, binId: bin.id } },
        update: { stockAvailable: { increment: line.quantity } },
        create: { factoryId, itemId: line.materialId, binId: bin.id, stockAvailable: line.quantity },
      });
      // bump cumulative received on the matching PO line
      const poLine = po.items.find((i) => i.materialId === line.materialId);
      if (poLine) {
        await tx.purchaseOrderItem.update({
          where: { id: poLine.id },
          data: { receivedQty: { increment: line.quantity } },
        });
      }
    }

    // COMPLETED once every line's cumulative received >= ordered, else PARTIALLY_RECEIVED
    const fullyReceived = po.items.every((i) => {
      const justNow = received.find((l) => l.materialId === i.materialId)?.quantity ?? 0;
      return i.receivedQty + justNow >= i.quantity - 1e-6;
    });
    await tx.purchaseOrder.update({
      where: { id },
      data: { status: fullyReceived ? "COMPLETED" : "PARTIALLY_RECEIVED" },
    });

    await tx.auditLog.create({
      data: {
        factoryId,
        actorUserId: user.id,
        action: `GRN ${receipt.receiptNumber} — ${received.length} line(s) received against ${po.poNumber}`,
        entityType: "PurchaseOrder",
        entityId: po.id,
        metadata: { poNumber: po.poNumber, receiptNumber: receipt.receiptNumber },
      },
    });
  }, { timeout: 30000, maxWait: 10000 });

  try {
    const { emitEvent, EVENTS, ownerRecipients } = await import("@/lib/server/events");
    await emitEvent({
      factoryId,
      event: EVENTS.PO_RECEIVED,
      recipients: (await ownerRecipients(factoryId)).filter((id) => id !== user.id),
      title: "Goods received",
      message: `${received.length} line(s) received against ${po.poNumber}.`,
      linkUrl: "/owner/inventory",
      type: "SUCCESS",
    });
  } catch (e) { console.error("PO-received event emit failed", e); }

  revalidatePath("/owner/inventory");
  revalidatePath("/owner/purchase");
  return { success: true };
}

// Convenience: receive every remaining (unreceived) quantity at PO rate in one shot.
// Backs the "Confirm Delivery" button on the Inventory raw-material tab.
export async function confirmPurchaseDelivery(id: string) {
  await guardModuleWrite("procurement");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, factoryId: user.factoryId },
    include: { items: true },
  });
  if (!po) return { error: "Purchase order not found" };
  const lines = po.items
    .map((i) => ({ materialId: i.materialId, quantity: i.quantity - i.receivedQty, rate: i.rate }))
    .filter((l) => l.quantity > 0);
  if (lines.length === 0) return { error: "Nothing left to receive" };
  return receivePurchaseOrder(id, lines);
}

export async function getPendingDeliveries() {
  await guardModuleAction("procurement");
  const user = await getOwnerUser();
  if (!user) return [];
  return prisma.purchaseOrder.findMany({
    where: { factoryId: user.factoryId, status: { in: ["SUBMITTED", "APPROVED", "PARTIALLY_RECEIVED"] } },
    include: { supplier: true, items: { include: { material: true } } },
    orderBy: { orderDate: "desc" },
  });
}

// Reorder suggestions: raw materials at/under their min-stock level. Suggests a
// quantity that lifts them back to safetyStock (fallback minStockLevel), plus the
// most recent supplier that quoted the material. Feeds the Purchase page card.
export async function getReorderSuggestions() {
  await guardModuleAction("procurement");
  const user = await getOwnerUser();
  if (!user) return [];
  const factoryId = user.factoryId;

  const [materials, ledgerSums, lastLines] = await Promise.all([
    prisma.itemMaster.findMany({
      where: { factoryId, itemType: "RAW_MATERIAL" },
      include: { conversions: true },
    }),
    prisma.stockLedgerEntry.groupBy({ by: ["itemId"], where: { factoryId }, _sum: { quantityChange: true } }),
    prisma.purchaseOrderItem.findMany({
      where: { purchaseOrder: { factoryId } },
      include: { purchaseOrder: { include: { supplier: true } } },
      orderBy: { purchaseOrder: { orderDate: "desc" } },
    }),
  ]);
  const netByItem = new Map(ledgerSums.map((l) => [l.itemId, l._sum.quantityChange ?? 0]));
  const supplierByItem = new Map<string, { id: string; name: string; rate: number }>();
  for (const line of lastLines) {
    if (!supplierByItem.has(line.materialId) && line.purchaseOrder.supplier) {
      supplierByItem.set(line.materialId, { id: line.purchaseOrder.supplierId, name: line.purchaseOrder.supplier.name, rate: line.rate });
    }
  }

  return materials
    .map((m) => {
      const net = netByItem.get(m.id) ?? 0;
      const toSecondary = m.secondaryUOM
        ? m.conversions.find((c) => c.fromUOM === m.secondaryUOM && c.toUOM === m.defaultUOM)
        : null;
      const target = m.safetyStock > 0 ? m.safetyStock : m.minStockLevel;
      const suggestedQty = Math.max(0, Math.ceil(target - net));
      return {
        id: m.id,
        name: m.name,
        sku: m.sku,
        uom: m.defaultUOM,
        netStock: net,
        secondaryNetStock:
          toSecondary && toSecondary.conversionFactor > 0
            ? net / toSecondary.conversionFactor
            : null,
        secondaryUom: m.secondaryUOM,
        minStockLevel: m.minStockLevel,
        suggestedQty,
        secondarySuggestedQty:
          toSecondary && toSecondary.conversionFactor > 0
            ? suggestedQty / toSecondary.conversionFactor
            : null,
        supplier: supplierByItem.get(m.id) ?? null,
      };
    })
    .filter((s) => s.minStockLevel > 0 && s.netStock <= s.minStockLevel && s.suggestedQty > 0);
}

// Notify the owner about any raw material at/under its min-stock level. Idempotent
// per item (skips items with an existing unread low-stock note). Routes through
// emitEvent so email/WhatsApp fire when configured.
export async function notifyLowStock() {
  await guardModuleAction("procurement");
  const user = await getOwnerUser();
  if (!user) return { notified: 0 };
  const factoryId = user.factoryId;
  const suggestions = await getReorderSuggestions();
  if (suggestions.length === 0) return { notified: 0 };

  const { emitEvent, EVENTS, ownerRecipients } = await import("@/lib/server/events");
  const owners = await ownerRecipients(factoryId);
  if (owners.length === 0) return { notified: 0 };

  let notified = 0;
  for (const s of suggestions) {
    const existing = await prisma.notification.findFirst({
      where: { factoryId, read: false, title: "Low stock", message: { contains: s.name } },
    });
    if (existing) continue;
    await emitEvent({
      factoryId,
      event: EVENTS.LOW_STOCK,
      recipients: owners,
      title: "Low stock",
      message: `${s.name} is at ${s.netStock} ${s.uom} (min ${s.minStockLevel}). Suggested reorder: ${s.suggestedQty}.`,
      linkUrl: "/owner/purchase",
      type: "WARNING",
    });
    notified++;
  }
  return { notified };
}
