"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";

const ACTIVE_STATUSES = ["WAITING", "IN_PROGRESS", "ON_HOLD", "BLOCKED", "QC_PENDING", "AWAITING_APPROVAL", "REWORK_REQUIRED"];

// A compact shape for a live job card on the floor: which order, what it is, who
// is on it, and its state — enough for both the overview cards and the detail page.
const floorJobInclude = {
  department: { select: { id: true, name: true, isQcStage: true } },
  stage: { select: { name: true } },
  assignedTo: { select: { id: true, name: true, role: true } },
  inspection: { select: { id: true, status: true } },
  workOrder: {
    select: {
      woNumber: true,
      productionPlan: {
        select: {
          salesOrder: {
            select: {
              soNumber: true, seatType: true, headrestCount: true, hasArmrest: true,
              customer: { select: { name: true } },
              material: { select: { name: true } },
              design: { select: { name: true, category: true } },
              color: { select: { name: true } },
              vehicleBrand: { select: { name: true } },
              vehicleModel: { select: { name: true, brand: { select: { name: true } } } },
            },
          },
          blueprintVersion: {
            select: {
              blueprint: {
                select: {
                  productVariant: {
                    select: {
                      product: { select: { name: true } },
                      fitments: { select: { vehicleModel: { select: { name: true, brand: { select: { name: true } } } } }, take: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

function shapeJob(jc: any) {
  const so = jc.workOrder?.productionPlan?.salesOrder;
  const variant = jc.workOrder?.productionPlan?.blueprintVersion?.blueprint?.productVariant;
  const fit = variant?.fitments?.[0];
  return {
    id: jc.id,
    status: jc.status,
    sequence: jc.sequence,
    startedAt: jc.startedAt,
    targetQty: jc.targetQty,
    completedQty: jc.completedQty,
    inspectionId: jc.inspection?.id ?? null,
    worker: jc.assignedTo ? { id: jc.assignedTo.id, name: jc.assignedTo.name, role: jc.assignedTo.role } : null,
    order: {
      soNumber: so?.soNumber ?? jc.workOrder?.woNumber ?? "—",
      customer: so?.customer?.name ?? null,
      brand: so?.vehicleBrand?.name ?? fit?.vehicleModel?.brand?.name ?? null,
      model: so?.vehicleModel?.name ?? fit?.vehicleModel?.name ?? null,
      product: variant?.product?.name ?? null,
      seatType: so?.seatType ?? null,
      headrestCount: so?.headrestCount ?? null,
      hasArmrest: so?.hasArmrest ?? false,
      fabric: so?.material?.name ?? null,
      design: so?.design ? `${so.design.category ? so.design.category + " " : ""}${so.design.name}` : null,
      color: so?.color?.name ?? null,
    },
  };
}

// Floor overview: one card per department with its live workload and roster.
export async function getFloorOverview() {
  const owner = await getOwnerUser();
  if (!owner) return [];
  const factoryId = owner.factoryId;

  const [departments, jobCards] = await Promise.all([
    prisma.department.findMany({
      where: { factoryId, active: true },
      orderBy: { sortOrder: "asc" },
      include: { members: { select: { id: true, name: true, role: true, isActive: true }, orderBy: { name: "asc" } } },
    }),
    prisma.jobCard.findMany({
      where: { factoryId, status: { in: ACTIVE_STATUSES }, workOrder: { status: { not: "DRAFT" } } },
      include: floorJobInclude,
      orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    }),
  ]);

  const byDept = new Map<string, any[]>();
  for (const jc of jobCards) {
    const list = byDept.get(jc.departmentId) ?? [];
    list.push(shapeJob(jc));
    byDept.set(jc.departmentId, list);
  }

  return departments.map((d) => {
    const jobs = byDept.get(d.id) ?? [];
    return {
      id: d.id,
      name: d.name,
      isQcStage: d.isQcStage,
      sortOrder: d.sortOrder,
      members: d.members.filter((m) => m.isActive),
      activeCount: jobs.length,
      inProgressCount: jobs.filter((j) => j.status === "IN_PROGRESS").length,
      waitingCount: jobs.filter((j) => j.status === "WAITING").length,
      blockedCount: jobs.filter((j) => ["BLOCKED", "ON_HOLD", "REWORK_REQUIRED"].includes(j.status)).length,
      jobs: jobs.slice(0, 4),
    };
  });
}

// Full live status for one department: every active job and the whole roster.
export async function getDepartmentFloor(departmentId: string) {
  const owner = await getOwnerUser();
  if (!owner) return null;
  const factoryId = owner.factoryId;

  const department = await prisma.department.findFirst({
    where: { id: departmentId, factoryId },
    include: { members: { select: { id: true, name: true, role: true, isActive: true }, orderBy: { name: "asc" } } },
  });
  if (!department) return null;

  const jobCards = await prisma.jobCard.findMany({
    where: { departmentId, factoryId, status: { in: ACTIVE_STATUSES }, workOrder: { status: { not: "DRAFT" } } },
    include: floorJobInclude,
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
  });
  const recent = await prisma.jobCard.findMany({
    where: { departmentId, factoryId, status: "COMPLETED" },
    include: floorJobInclude,
    orderBy: { completedAt: "desc" },
    take: 10,
  });

  const jobs = jobCards.map(shapeJob);
  // Who each active worker is currently on, for the roster panel.
  const workingBy = new Map<string, any>();
  for (const j of jobs) if (j.worker && j.status === "IN_PROGRESS") workingBy.set(j.worker.id, j);

  return {
    id: department.id,
    name: department.name,
    isQcStage: department.isQcStage,
    members: department.members.filter((m) => m.isActive).map((m) => ({ ...m, currentJob: workingBy.get(m.id) ?? null })),
    jobs,
    recent: recent.map(shapeJob),
    stats: {
      active: jobs.length,
      inProgress: jobs.filter((j) => j.status === "IN_PROGRESS").length,
      waiting: jobs.filter((j) => j.status === "WAITING").length,
      blocked: jobs.filter((j) => ["BLOCKED", "ON_HOLD", "REWORK_REQUIRED"].includes(j.status)).length,
      qcPending: jobs.filter((j) => ["QC_PENDING", "AWAITING_APPROVAL"].includes(j.status)).length,
    },
  };
}

export async function startJobCard(jobCardId: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const jobCard = await prisma.jobCard.findUnique({ where: { id: jobCardId } });
    if (!jobCard || jobCard.status !== "WAITING") return { error: "Job card not waiting" };

    await prisma.jobCard.update({
      where: { id: jobCardId },
      data: { status: "IN_PROGRESS", startedAt: new Date() }
    });

    revalidatePath("/owner/floor");
    return { success: true };
  } catch (error) {
    return { error: "Failed to start job card" };
  }
}

export async function completeJobCard(jobCardId: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const jobCard = await prisma.jobCard.findUnique({ 
      where: { id: jobCardId },
      include: { workOrder: true }
    });
    if (!jobCard || jobCard.status !== "IN_PROGRESS") return { error: "Job card not in progress" };

    // Move to QC
    await prisma.jobCard.update({
      where: { id: jobCardId },
      data: { status: "QC_PENDING", completedAt: new Date() }
    });

    revalidatePath("/owner/floor");
    revalidatePath("/owner/qc-floor");
    return { success: true };
  } catch (error) {
    return { error: "Failed to complete job card" };
  }
}
