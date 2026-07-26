"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";
import { recordTimeline } from "@/lib/server/stages";
import { jobCardBatchLabel } from "@/lib/server/jobCardAdapter";
import { publishChange } from "@/lib/server/live-bus";
import { revalidatePath } from "next/cache";

// Who works a given stage can change after the order is created — someone is
// off sick, a job is handed to a faster operator, or the wrong person was picked
// in the studio. This is the single write-path for that.

function isOwnerRole(role: string) {
  return role === "OWNER" || role === "CO_OWNER" || role === "MANAGER";
}

function revalidateAssignmentPaths(factoryId?: string, actorId?: string) {
  revalidatePath("/owner/production");
  revalidatePath("/owner/floor");
  revalidatePath("/worker");
  if (factoryId) publishChange(factoryId, "STAGE", actorId);
}

/**
 * Reassign a stage's job card to a different person (or unassign with null).
 * Allowed for management, or the supervisor of that card's own department.
 * Completed stages are locked — history stays honest.
 */
export async function reassignJobCard(jobCardId: string, userId: string | null) {
  const session = await getUserSession();
  if (!session) return { error: "Unauthorized" };

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: jobCardId, factoryId: session.factoryId },
    include: { department: true, stage: true, workOrder: true, assignedTo: { select: { id: true, name: true } } },
  });
  if (!jobCard) return { error: "Job card not found" };

  // Management can reassign anywhere; a supervisor only inside their department.
  const isManagement = isOwnerRole(session.role);
  if (!isManagement) {
    if (session.role !== "SUPERVISOR") return { error: "Unauthorized" };
    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { departmentId: true },
    });
    if (!me?.departmentId || me.departmentId !== jobCard.departmentId) {
      return { error: "You can only reassign work in your own department" };
    }
  }

  if (jobCard.status === "COMPLETED") {
    return { error: "This stage is already completed and cannot be reassigned" };
  }

  const stageLabel = jobCard.department?.name ?? jobCard.stage?.name ?? `Step ${jobCard.sequence}`;

  // The new assignee must actually staff this department — otherwise the card
  // would sit in a queue the person never sees.
  let newUser: { id: string; name: string } | null = null;
  if (userId) {
    const candidate = await prisma.user.findFirst({
      where: { id: userId, factoryId: session.factoryId, isActive: true },
      select: { id: true, name: true, departmentId: true },
    });
    if (!candidate) return { error: "That person is not an active member of this factory" };
    if (candidate.departmentId && candidate.departmentId !== jobCard.departmentId) {
      return { error: `${candidate.name} is not staffed in ${stageLabel}` };
    }
    newUser = { id: candidate.id, name: candidate.name };
  }

  if ((jobCard.assignedToId ?? null) === (userId ?? null)) {
    return { success: true, unchanged: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.jobCard.update({
      where: { id: jobCard.id },
      data: { assignedToId: newUser?.id ?? null },
    });

    // Tell the new owner of the work, but only when it is actually actionable.
    if (newUser && ["WAITING", "IN_PROGRESS", "REWORK_REQUIRED", "ON_HOLD"].includes(jobCard.status)) {
      await tx.notification.create({
        data: {
          factoryId: session.factoryId,
          userId: newUser.id,
          title: `${stageLabel} assigned to you`,
          message: `${jobCardBatchLabel(jobCard)}: you have been assigned the ${stageLabel} stage.`,
          type: "ACTION_REQUIRED",
          linkUrl: jobCard.department?.isQcStage || jobCard.stage?.isQcStage
            ? `/worker/inspection/${jobCard.id}`
            : `/worker/stage/${jobCard.id}`,
        },
      });
    }

    await recordTimeline(tx, {
      factoryId: session.factoryId,
      workOrderId: jobCard.workOrderId,
      eventType: "UPDATED",
      title: newUser
        ? `${stageLabel} reassigned to ${newUser.name}`
        : `${stageLabel} unassigned`,
      description: jobCard.assignedTo?.name ? `Previously ${jobCard.assignedTo.name}` : undefined,
      actorId: session.userId,
      metadata: { jobCardId: jobCard.id, from: jobCard.assignedToId, to: newUser?.id ?? null },
    });

    await tx.auditLog.create({
      data: {
        factoryId: session.factoryId,
        actorUserId: session.userId,
        action: newUser
          ? `Reassigned ${stageLabel} for ${jobCardBatchLabel(jobCard)} to ${newUser.name}`
          : `Unassigned ${stageLabel} for ${jobCardBatchLabel(jobCard)}`,
        entityType: "JobCard",
        entityId: jobCard.id,
        metadata: { from: jobCard.assignedTo?.name ?? null, to: newUser?.name ?? null },
      },
    });
  }, { timeout: 30000, maxWait: 10000 });

  revalidateAssignmentPaths(session.factoryId, session.userId);
  return { success: true, assignedTo: newUser };
}

/** The people who can staff a department — used to populate reassign pickers. */
export async function getDepartmentRoster(departmentId: string) {
  const session = await getUserSession();
  if (!session) return [];
  return prisma.user.findMany({
    where: { factoryId: session.factoryId, departmentId, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}
