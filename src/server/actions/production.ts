"use server";

import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { createStockEntry } from "@/server/actions/inventory";

export async function planSalesOrder(orderId: string) {
  await guardModuleWrite("manufacturing");
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: orderId, factoryId: owner.factoryId },
      include: { items: true }
    });

    if (!order || order.status !== "APPROVED") return { error: "Order must be APPROVED" };

    // Create a Production Plan for each item in the order
    for (const item of order.items) {
      if (!item.itemId) continue;
      // Find the active blueprint for this item (blueprints are keyed on the item).
      const blueprint = await prisma.blueprintVersion.findFirst({
        where: { blueprint: { itemId: item.itemId }, isActive: true }
      });

      // If no published blueprint, fallback to draft (for Phase 1 simplicity)
      const fallbackBlueprint = blueprint || await prisma.blueprintVersion.findFirst({
        where: { blueprint: { itemId: item.itemId } }
      });

      if (fallbackBlueprint) {
        await prisma.productionPlan.create({
          data: {
            factoryId: owner.factoryId,
            salesOrderId: order.id,
            blueprintVersionId: fallbackBlueprint.id,
            quantity: item.quantity,
            status: "PENDING",
            priority: "NORMAL"
          }
        });
      }
    }

    // Mark SalesOrder as IN_PRODUCTION
    await prisma.salesOrder.update({
      where: { id: order.id },
      data: { status: "IN_PRODUCTION" }
    });

    revalidatePath("/owner/production");
    revalidatePath("/owner/production");
    return { success: true };
  } catch (error) {
    console.error("Error planning sales order:", error);
    return { error: "Failed to plan Sales Order" };
  }
}

export async function releasePlanToWorkOrder(planId: string) {
  await guardModuleWrite("manufacturing");
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const plan = await prisma.productionPlan.findUnique({
      where: { id: planId, factoryId: owner.factoryId },
      include: { blueprintVersion: { include: { routeSteps: { orderBy: { sequence: 'asc' } } } } }
    });

    if (!plan || plan.status !== "PENDING") return { error: "Invalid Plan" };

    const count = await prisma.workOrder.count({ where: { factoryId: owner.factoryId } });
    const woNumber = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Create Work Order
    const workOrder = await prisma.workOrder.create({
      data: {
        factoryId: owner.factoryId,
        woNumber,
        productionPlanId: plan.id,
        targetQty: plan.quantity,
        status: "PLANNED"
      }
    });

    // Generate Job Cards based on Blueprint Route
    for (const step of plan.blueprintVersion.routeSteps) {
      await prisma.jobCard.create({
        data: {
          factoryId: owner.factoryId,
          workOrderId: workOrder.id,
          departmentId: step.departmentId,
          sequence: step.sequence,
          status: step.sequence === 1 ? "WAITING" : "BLOCKED", // First step is WAITING, others BLOCKED
          targetQty: plan.quantity,
        }
      });
    }

    // Update Plan
    await prisma.productionPlan.update({
      where: { id: plan.id },
      data: { status: "RELEASED" }
    });

    revalidatePath("/owner/production");
    revalidatePath("/owner/dashboard");
    return { success: true, workOrderId: workOrder.id };
  } catch (error) {
    console.error("Error releasing plan:", error);
    return { error: "Failed to release Plan" };
  }
}

// ==========================================
// Legacy production actions (approved V1 UI) ported onto
// WorkOrder/JobCard and BOM/BOMItem.
// ==========================================

export async function getActiveWorkOrders() {
  await guardModuleAction("manufacturing");
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const workOrders = await prisma.workOrder.findMany({
    where: {
      factoryId: user.factoryId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    include: {
      productionPlan: {
        include: {
          blueprintVersion: {
            include: { blueprint: { include: { item: true } } },
          },
        },
      },
      jobCards: {
        include: { department: true, assignedTo: true },
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { startDate: "desc" },
  });

  return workOrders.map((wo) => ({
    ...wo,
    createdAt: wo.startDate ?? new Date(),
    quantity: wo.targetQty,
    productVariant: null,
    tasks: wo.jobCards,
  }));
}

export async function createProductionTask(data: {
  await guardModuleWrite("manufacturing");
  workOrderId: string;
  departmentId: string;
  assignedToId?: string;
}) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const wo = await prisma.workOrder.findUnique({ where: { id: data.workOrderId, factoryId: user.factoryId } });
  if (!wo) throw new Error("Work order not found");

  const existing = await prisma.jobCard.count({ where: { workOrderId: wo.id } });

  const task = await prisma.jobCard.create({
    data: {
      factoryId: user.factoryId,
      workOrderId: data.workOrderId,
      departmentId: data.departmentId,
      assignedToId: data.assignedToId || null,
      sequence: existing + 1,
      status: "WAITING",
      targetQty: wo.targetQty,
    },
  });

  revalidatePath("/owner/production");
  revalidatePath("/owner/qc-floor");
  return task;
}

export async function updateTaskStatus(id: string, status: string) {
  await guardModuleWrite("manufacturing");
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const mappedStatus = status === "PENDING" ? "WAITING" : status;

  const task = await prisma.jobCard.update({
    where: { id, factoryId: user.factoryId },
    data: {
      status: mappedStatus,
      startedAt: mappedStatus === "IN_PROGRESS" ? new Date() : undefined,
      completedAt: mappedStatus === "COMPLETED" ? new Date() : undefined,
    },
  });

  revalidatePath("/owner/qc-floor");
  revalidatePath("/owner/production");
  return task;
}

export async function getAllProductionTasks() {
  await guardModuleAction("manufacturing");
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const jobCards = await prisma.jobCard.findMany({
    where: { factoryId: user.factoryId },
    include: {
      workOrder: {
        include: {
          productionPlan: {
            include: {
              blueprintVersion: {
                include: { blueprint: { include: { item: true } } },
              },
            },
          },
        },
      },
      department: true,
      assignedTo: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return jobCards.map((jc) => ({
    ...jc,
    workOrder: {
      ...jc.workOrder,
      productVariant: null,
    },
  }));
}

export async function getDepartments() {
  await guardModuleAction("manufacturing");
  const user = await getOwnerUser();
  if (!user) return [];
  return prisma.department.findMany({ where: { factoryId: user.factoryId } });
}

export async function updateWorkOrderStatus(id: string, status: string) {
  await guardModuleWrite("manufacturing");
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const wo = await prisma.workOrder.update({
    where: { id, factoryId: user.factoryId },
    data: { status },
  });

  revalidatePath("/owner/production");
  return wo;
}

export async function getCompletedWorkOrders() {
  await guardModuleAction("manufacturing");
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const workOrders = await prisma.workOrder.findMany({
    where: { factoryId: user.factoryId, status: "COMPLETED" },
    include: {
      productionPlan: {
        include: {
          blueprintVersion: {
            include: { blueprint: { include: { item: true } } },
          },
        },
      },
    },
    orderBy: { endDate: "desc" },
    take: 50,
  });

  return workOrders.map((wo) => ({
    ...wo,
    createdAt: wo.startDate ?? new Date(),
    quantity: wo.targetQty,
    productVariant: null,
  }));
}

export async function completeWorkOrder(id: string, warehouseId: string) {
  await guardModuleAction("manufacturing");
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const wo = await prisma.workOrder.findUnique({
    where: { id, factoryId: user.factoryId },
    include: {
      productionPlan: {
        include: {
          blueprintVersion: {
            include: {
              blueprint: { include: { item: true } },
              bom: { include: { items: true } },
            },
          },
        },
      },
    },
  });

  if (!wo) throw new Error("Work order not found");
  if (wo.status === "COMPLETED") throw new Error("Work order already completed");

  // The blueprint's item is what was produced. A spec-created item may have no
  // sales variant, so finished goods are received against the item and the
  // variant is only used where the legacy stock helper still needs it.
  // The blueprint's item is what was produced, and what stock is received
  // against. A spec-created item need not have a sales variant.
  const producedItem = wo.productionPlan.blueprintVersion.blueprint.item;
  const bomItems = wo.productionPlan.blueprintVersion.bom?.items ?? [];

  // Consume raw materials according to the BOM (backflush)
  for (const bomItem of bomItems) {
    const totalToConsume = bomItem.quantity * wo.targetQty * (1 + bomItem.wastePercent / 100);
    await createStockEntry({
      transactionType: "ISSUE",
      warehouseId,
      materialId: bomItem.itemId,
      quantityChange: -totalToConsume,
      referenceDocType: "WORK_ORDER",
      referenceDocId: wo.id,
    });
  }

  // Receive finished goods
  await createStockEntry({
    transactionType: "RECEIPT",
    warehouseId,
    materialId: producedItem.id,
    quantityChange: wo.targetQty,
    referenceDocType: "WORK_ORDER",
    referenceDocId: wo.id,
  });

  await prisma.workOrder.update({
    where: { id },
    data: { status: "COMPLETED", endDate: new Date() },
  });

  revalidatePath("/owner/production");
  revalidatePath("/owner/inventory");
}
