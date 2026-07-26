"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { createStockEntry } from "@/server/actions/inventory";

export async function planSalesOrder(orderId: string) {
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
      // Find the active blueprint for this variant
      const blueprint = await prisma.blueprintVersion.findFirst({
        where: { blueprint: { productVariantId: item.productVariantId }, isActive: true }
      });
      
      // If no published blueprint, fallback to draft (for Phase 1 simplicity)
      const fallbackBlueprint = blueprint || await prisma.blueprintVersion.findFirst({
        where: { blueprint: { productVariantId: item.productVariantId } }
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
            include: { blueprint: { include: { productVariant: { include: { product: true } } } } },
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
    productVariant: wo.productionPlan.blueprintVersion.blueprint.productVariant,
    tasks: wo.jobCards,
  }));
}

export async function createProductionTask(data: {
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
                include: { blueprint: { include: { productVariant: { include: { product: true } } } } },
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
      productVariant: jc.workOrder.productionPlan.blueprintVersion.blueprint.productVariant,
    },
  }));
}

export async function getDepartments() {
  const user = await getOwnerUser();
  if (!user) return [];
  return prisma.department.findMany({ where: { factoryId: user.factoryId } });
}

export async function saveBOM(variantId: string, items: { materialId: string; qtyFormula: string; wastePercentage: number }[]) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.$transaction(async (tx) => {
    // BOMs hang off the blueprint version now; self-heal the chain for
    // variants that predate blueprints.
    let blueprint = await tx.blueprint.findUnique({
      where: { productVariantId: variantId },
      include: { versions: true },
    });
    if (!blueprint) {
      blueprint = await tx.blueprint.create({
        data: { factoryId: user.factoryId, productVariantId: variantId },
        include: { versions: true },
      });
    }
    let version = blueprint.versions.find((v) => v.isActive) ?? blueprint.versions[0];
    if (!version) {
      version = await tx.blueprintVersion.create({
        data: {
          blueprintId: blueprint.id,
          versionNumber: 1,
          name: "V1 - Standard",
          isActive: true,
        },
      });
      await tx.blueprint.update({ where: { id: blueprint.id }, data: { activeVersionId: version.id } });
    }

    let bom = await tx.bOM.findUnique({ where: { blueprintVersionId: version.id } });
    if (!bom) {
      bom = await tx.bOM.create({
        data: { factoryId: user.factoryId, blueprintVersionId: version.id },
      });
    }

    await tx.bOMItem.deleteMany({ where: { bomId: bom.id } });
    if (items.length > 0) {
      await tx.bOMItem.createMany({
        data: items.map((item) => ({
          bomId: bom!.id,
          itemId: item.materialId,
          quantity: parseFloat(item.qtyFormula) || 1,
          wastePercent: item.wastePercentage,
        })),
      });
    }
  }, { timeout: 30000, maxWait: 10000 });

  revalidatePath("/owner/settings");
}

export async function createWorkOrder(data: {
  productVariantId: string;
  quantity: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  // WorkOrders require a ProductionPlan + BlueprintVersion; self-heal the
  // chain for variants without one.
  let blueprint = await prisma.blueprint.findUnique({
    where: { productVariantId: data.productVariantId },
    include: { versions: true },
  });
  if (!blueprint) {
    blueprint = await prisma.blueprint.create({
      data: { factoryId: user.factoryId, productVariantId: data.productVariantId },
      include: { versions: true },
    });
  }
  let version = blueprint.versions.find((v) => v.isActive) ?? blueprint.versions[0];
  if (!version) {
    version = await prisma.blueprintVersion.create({
      data: { blueprintId: blueprint.id, versionNumber: 1, name: "V1 - Standard", isActive: true },
    });
    await prisma.blueprint.update({ where: { id: blueprint.id }, data: { activeVersionId: version.id } });
  }

  const plan = await prisma.productionPlan.create({
    data: {
      factoryId: user.factoryId,
      blueprintVersionId: version.id,
      quantity: data.quantity,
      status: "RELEASED",
    },
  });

  const count = await prisma.workOrder.count({ where: { factoryId: user.factoryId } });
  const wo = await prisma.workOrder.create({
    data: {
      factoryId: user.factoryId,
      woNumber: `WO-${String(count + 1).padStart(5, "0")}`,
      productionPlanId: plan.id,
      targetQty: data.quantity,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "PLANNED",
    },
  });

  revalidatePath("/owner/production");
  return wo;
}

export async function updateWorkOrderStatus(id: string, status: string) {
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
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const workOrders = await prisma.workOrder.findMany({
    where: { factoryId: user.factoryId, status: "COMPLETED" },
    include: {
      productionPlan: {
        include: {
          blueprintVersion: {
            include: { blueprint: { include: { productVariant: { include: { product: true } } } } },
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
    productVariant: wo.productionPlan.blueprintVersion.blueprint.productVariant,
  }));
}

export async function completeWorkOrder(id: string, warehouseId: string) {
  const user = await getOwnerUser();
  if (!user) throw new Error("Unauthorized");

  const wo = await prisma.workOrder.findUnique({
    where: { id, factoryId: user.factoryId },
    include: {
      productionPlan: {
        include: {
          blueprintVersion: {
            include: {
              blueprint: { include: { productVariant: true } },
              bom: { include: { items: true } },
            },
          },
        },
      },
    },
  });

  if (!wo) throw new Error("Work order not found");
  if (wo.status === "COMPLETED") throw new Error("Work order already completed");

  const variant = wo.productionPlan.blueprintVersion.blueprint.productVariant;
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
    productVariantId: variant.id,
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
