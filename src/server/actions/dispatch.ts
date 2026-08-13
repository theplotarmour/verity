"use server";

import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { deriveProductionStatus, isDispatchReady } from "@/lib/production-status";
import { checkOpeningSop } from "@/server/internal/sopGate";

// Ensures a Default zone/rack/shelf/bin chain for a warehouse (mirrors
// inventory.ts — the ledger is bin-level while the UI works per location).
async function ensureDefaultBin(factoryId: string, warehouseId: string) {
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

async function resolveOrderItem(salesOrderId: string) {
  const order = await prisma.salesOrder.findUniqueOrThrow({
    where: { id: salesOrderId },
    include: { items: true },
  });
  const item = order.items[0];
  return { order, itemId: item?.itemId ?? (order as any).itemId ?? null, quantity: item?.quantity ?? 1 };
}

// Orders eligible for dispatch. A production only becomes dispatchable once the
// whole physical route is genuinely finished — cutting, stitching, QC approval,
// packing and sealing — so a verified passport alone is not enough. Stock
// matched to a READY order is the one exception: its goods already exist.
export async function getDispatchableOrders() {
  await guardModuleAction("sales");
  const user = await getOwnerUser();
  if (!user) return [];

  const orders = await prisma.salesOrder.findMany({
    where: {
      factoryId: user.factoryId,
      dispatches: { none: {} },
      OR: [
        { status: "READY" },
        {
          plans: {
            some: {
              workOrders: {
                some: { jobCards: { some: { inspection: { report: { isNot: null } } } } },
              },
            },
          },
        },
      ],
    },
    include: {
      customer: true,
      plans: {
        select: {
          workOrders: {
            select: {
              jobCards: {
                select: {
                  sequence: true,
                  status: true,
                  department: { select: { name: true } },
                  stage: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { orderDate: "desc" },
  });

  return orders
    .map((order) => {
      const jobCards = order.plans.flatMap((p) =>
        p.workOrders.flatMap((wo) =>
          wo.jobCards.map((c) => ({
            sequence: c.sequence,
            status: c.status,
            departmentName: c.department?.name ?? null,
            stageName: c.stage?.name ?? null,
          }))
        )
      );
      const { plans, ...rest } = order;
      return {
        ...rest,
        productionStatus: deriveProductionStatus({ orderStatus: order.status, jobCards }),
        dispatchReady: order.status === "READY" || isDispatchReady({ orderStatus: order.status, jobCards }),
      };
    })
    .filter((o) => o.dispatchReady);
}

export async function getDispatchDestinations() {
  await guardModuleAction("sales");
  const user = await getOwnerUser();
  if (!user) return [];
  return prisma.warehouse.findMany({
    where: { factoryId: user.factoryId },
    orderBy: { name: "asc" },
  });
}

export async function createDispatch(data: {
  salesOrderId: string;
  destinationType: "WAREHOUSE" | "STORE" | "CUSTOMER";
  destinationWarehouseId?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  transporter?: string;
  vehicleNo?: string;
  trackingId?: string;
  notes?: string;
}) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("sales");
  const factoryId = user.factoryId;

  const order = await prisma.salesOrder.findFirst({
    where: { id: data.salesOrderId, factoryId },
    include: {
      dispatches: true,
      plans: {
        include: {
          workOrders: {
            include: { jobCards: { include: { inspection: { include: { report: true } } } } },
          },
        },
      },
    },
  });
  if (!order) return { error: "Order not found" };
  if (order.dispatches.length > 0) return { error: "Order already dispatched" };

  // The daily SOP gate. Only bites where the order belongs to an outlet *and*
  // that tenant has configured an opening checklist — a factory with neither is
  // not blocked by a rule it never opted into. See `internal/sopGate.ts`.
  const sop = await checkOpeningSop(factoryId, order.siteId);
  if (!sop.open) return { error: sop.reason ?? "Today's opening checklist is not complete." };

  const hasPassport = order.status === "READY" || order.plans.some((p) =>
    p.workOrders.some((wo) => wo.jobCards.some((jc) => jc.inspection?.report))
  );
  if (!hasPassport) {
    return { error: "Order needs a verified passport before dispatch" };
  }

  if (data.destinationType !== "CUSTOMER" && !data.destinationWarehouseId) {
    return { error: "Select a destination location" };
  }

  const dispatch = await prisma.dispatch.create({
    data: {
      factoryId,
      salesOrderId: order.id,
      destinationType: data.destinationType,
      destinationWarehouseId: data.destinationType === "CUSTOMER" ? null : data.destinationWarehouseId,
      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      address: data.address || null,
      transporter: data.transporter || null,
      vehicleNo: data.vehicleNo || null,
      trackingId: data.trackingId || null,
      notes: data.notes || null,
    },
  });

  await prisma.salesOrder.update({
    where: { id: order.id },
    data: { status: "DISPATCHED" },
  });

  await prisma.auditLog.create({
    data: {
      factoryId,
      actorUserId: user.id,
      action: `Order ${order.soNumber} dispatched (${data.destinationType.toLowerCase()})`,
      entityType: "Dispatch",
      entityId: dispatch.id,
      metadata: { soNumber: order.soNumber, destinationType: data.destinationType },
    },
  });

  revalidatePath("/owner/logistics");
  revalidatePath("/owner/inventory");
  revalidatePath("/owner/production");
  return { success: true, dispatchId: dispatch.id };
}

export async function getDispatches() {
  await guardModuleAction("sales");
  const user = await getOwnerUser();
  if (!user) return [];
  return prisma.dispatch.findMany({
    where: { factoryId: user.factoryId },
    include: {
      // item, not the ProductVariant -> Product hop: those tables are empty, so
      // the logistics list showed every shipment as the word "Order".
      salesOrder: {
        include: {
          customer: true,
          item: { select: { name: true, group: { select: { name: true } } } },
          items: true,
        },
      },
      destinationWarehouse: true,
    },
    orderBy: { dispatchedAt: "desc" },
  });
}

export async function confirmDelivery(dispatchId: string) {
  await guardModuleWrite("sales");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  const factoryId = user.factoryId;

  const dispatch = await prisma.dispatch.findFirst({
    where: { id: dispatchId, factoryId },
    include: { salesOrder: true },
  });
  if (!dispatch) return { error: "Dispatch not found" };
  if (dispatch.status === "DELIVERED") return { error: "Already delivered" };

  // Warehouse/store deliveries put the goods into that location's stock.
  if (dispatch.destinationType !== "CUSTOMER" && dispatch.destinationWarehouseId) {
    const { itemId, quantity } = await resolveOrderItem(dispatch.salesOrderId);
    if (itemId) {
      const bin = await ensureDefaultBin(factoryId, dispatch.destinationWarehouseId);
      await prisma.stockLedgerEntry.create({
        data: {
          factoryId,
          transactionType: "RECEIPT",
          itemId,
          binId: bin.id,
          quantityChange: quantity,
          valuationRate: 0,
          totalValue: 0,
          referenceDocType: "DISPATCH",
          referenceDocId: dispatch.id,
        },
      });
      await prisma.binBalance.upsert({
        where: { itemId_binId: { itemId, binId: bin.id } },
        update: { stockAvailable: { increment: quantity } },
        create: { factoryId, itemId, binId: bin.id, stockAvailable: quantity },
      });
    }
  }

  await prisma.dispatch.update({
    where: { id: dispatch.id },
    data: { status: "DELIVERED", deliveredAt: new Date() },
  });
  await prisma.salesOrder.update({
    where: { id: dispatch.salesOrderId },
    data: { status: "DELIVERED" },
  });

  await prisma.auditLog.create({
    data: {
      factoryId,
      actorUserId: user.id,
      action: `Dispatch delivered (${dispatch.destinationType.toLowerCase()})`,
      entityType: "Dispatch",
      entityId: dispatch.id,
      metadata: { salesOrderId: dispatch.salesOrderId },
    },
  });

  // High-value event: notify owners in-app + email/WhatsApp.
  try {
    const { emitEvent, EVENTS, ownerRecipients } = await import("@/lib/server/events");
    await emitEvent({
      factoryId,
      event: EVENTS.DISPATCH_COMPLETED as any,
      recipients: await ownerRecipients(factoryId),
      title: "Dispatch delivered",
      message: `Order ${dispatch.salesOrder?.soNumber ?? ""} was delivered (${dispatch.destinationType.toLowerCase()}).`,
      linkUrl: "/owner/logistics",
      type: "SUCCESS",
    });
  } catch (e) {
    console.error("dispatch-completed event emit failed", e);
  }

  revalidatePath("/owner/logistics");
  revalidatePath("/owner/inventory");
  return { success: true };
}
