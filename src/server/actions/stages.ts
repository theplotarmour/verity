"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";
import { revalidatePath } from "next/cache";
import { uploadStorageImage } from "@/server/actions/storage";
import { createStoragePath } from "@/lib/storage/paths";
import { jobCardInclude, toWorkerJob, jobCardBatchLabel } from "@/lib/server/jobCardAdapter";
import { canAccessJobCard } from "@/lib/server/jobCardAccess";
import { recordTimeline } from "@/lib/server/stages";
import { receiveFinishedGoods } from "@/server/actions/inventory";
import { publishChange } from "@/lib/server/live-bus";
import { getSessionHomePath } from "@/lib/server/roleHome";

type StageImagePayload = {
  dataUrl: string;
  fileName?: string;
  contentType?: string;
  size?: number;
};

function isOwnerRole(role: string) {
  return role === "OWNER" || role === "CO_OWNER" || role === "MANAGER";
}

function canWorkStage(role: string) {
  // Supervisors can drive their department's stage cards too (they oversee and
  // sign off on the stage).
  return role === "WORKER" || role === "SUPERVISOR" || isOwnerRole(role);
}

// AWAITING_APPROVAL is included so a worker can amend and re-submit their
// response right up until the supervisor signs off. Re-submitting simply files
// a fresh StageEntry and puts the card back in the approval queue.
const ACTIVE_STAGE_STATUSES = ["WAITING", "IN_PROGRESS", "ON_HOLD", "REWORK_REQUIRED", "AWAITING_APPROVAL"];

// A stage's config lives on its department (new cards) or, for older in-flight
// cards, on the legacy WorkflowStage. Read both so both keep working.
const stageIsQc = (jc: any) => !!(jc?.stage?.isQcStage || jc?.department?.isQcStage);
const stageName = (jc: any) => jc?.stage?.name ?? jc?.department?.name ?? "Stage";
const stageReqPhoto = (jc: any) => jc?.department ? !!jc.department.requirePhoto : !!jc?.stage?.requirePhoto;
const stageReqRemarks = (jc: any) => jc?.department ? !!jc.department.requireRemarks : !!jc?.stage?.requireRemarks;

function revalidateStagePaths(factoryId?: string, actorId?: string) {
  revalidatePath("/worker");
  revalidatePath("/supervisor");
  revalidatePath("/owner/floor");
  revalidatePath("/owner/production");
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/inventory");
  // Push a live-refresh nudge to every connected client in the factory
  // (tagged with the actor so their own tab doesn't double-refresh).
  if (factoryId) publishChange(factoryId, "STAGE", actorId);
}

// Full context for the worker stage screen: the job (legacy shape), its
// stage, previous submissions (rework history) and sibling stage cards.
export async function getStageJob(jobCardId: string) {
  const session = await getUserSession();
  if (!session) return null;

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: jobCardId, factoryId: session.factoryId },
    include: {
      ...jobCardInclude,
      stage: true,
      stageEntries: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!jobCard) return null;
  // Only the card's own worker (or its department supervisor / management) may
  // open it — a worker can't reach another person's job card by URL.
  if (!(await canAccessJobCard(session, jobCard))) return null;

  const siblings = await prisma.jobCard.findMany({
    where: { workOrderId: jobCard.workOrderId },
    include: { stage: true, department: true },
    orderBy: { sequence: "asc" },
  });

  // Surface the department as the stage the worker screen renders (its template,
  // photo/remarks rules), falling back to the legacy WorkflowStage for old cards.
  const stageForScreen = jobCard.department ?? jobCard.stage;

  // A non-QC department can carry a checklist template the operator must clear to
  // complete the stage (the same builder QC uses). QC stages run the inspection
  // flow instead, so their template is never surfaced here.
  const templateId = !stageForScreen?.isQcStage ? jobCard.department?.templateId : null;
  const template = templateId
    ? await prisma.qCTemplate.findFirst({
        where: { id: templateId, factoryId: session.factoryId },
        include: {
          sections: {
            orderBy: { sortOrder: "asc" },
            include: { checkpoints: { orderBy: { sortOrder: "asc" } } },
          },
        },
      })
    : null;

  const canApprove = session.role === "SUPERVISOR" || isOwnerRole(session.role);

  return {
    job: toWorkerJob(jobCard),
    stage: stageForScreen,
    template,
    canApprove,
    homePath: await getSessionHomePath(session),
    viewerId: session.userId,
    entries: jobCard.stageEntries,
    siblings: siblings.map((s) => ({
      id: s.id,
      sequence: s.sequence,
      status: s.status,
      stageName: s.stage?.name ?? s.department?.name ?? `Step ${s.sequence}`,
      isQcStage: !!(s.stage?.isQcStage || s.department?.isQcStage),
    })),
  };
}

export async function startStage(jobCardId: string) {
  const session = await getUserSession();
  if (!session || !canWorkStage(session.role)) return { error: "Unauthorized" };

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: jobCardId, factoryId: session.factoryId },
    include: {
      stage: true,
      department: true,
      workOrder: { include: { productionPlan: { include: { salesOrder: { select: { scheduledFor: true } } } } } },
    },
  });
  if (!jobCard) return { error: "Job card not found" };
  if (!(await canAccessJobCard(session, jobCard))) return { error: "This job card isn't assigned to you." };
  // A scheduled production can't be started before its day, even by direct URL.
  const scheduledFor = (jobCard as any).workOrder?.productionPlan?.salesOrder?.scheduledFor as Date | null | undefined;
  if (scheduledFor && session.role === "WORKER") {
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
    if (scheduledFor > endOfToday) {
      return { error: `Scheduled for ${new Date(scheduledFor).toLocaleDateString()} — not yet available.` };
    }
  }
  if (!["WAITING", "ON_HOLD", "REWORK_REQUIRED"].includes(jobCard.status)) {
    return { error: `Stage cannot be started from status ${jobCard.status}` };
  }

  await prisma.jobCard.update({
    where: { id: jobCard.id },
    data: { status: "IN_PROGRESS", startedAt: jobCard.startedAt ?? new Date() },
  });
  await recordTimeline(prisma, {
    factoryId: session.factoryId,
    workOrderId: jobCard.workOrderId,
    eventType: "STATUS_CHANGED",
    title: `${stageName(jobCard)} started`,
    actorId: session.userId,
    metadata: { jobCardId: jobCard.id, stage: stageName(jobCard) },
  });

  revalidateStagePaths(session.factoryId, session.userId);
  return { success: true };
}

export async function holdStage(jobCardId: string, reason?: string) {
  const session = await getUserSession();
  if (!session || !canWorkStage(session.role)) return { error: "Unauthorized" };

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: jobCardId, factoryId: session.factoryId },
    include: { stage: true, department: true },
  });
  if (!jobCard) return { error: "Job card not found" };
  if (!(await canAccessJobCard(session, jobCard))) return { error: "This job card isn't assigned to you." };
  if (jobCard.status !== "IN_PROGRESS") return { error: "Only an in-progress stage can be held" };

  await prisma.jobCard.update({ where: { id: jobCard.id }, data: { status: "ON_HOLD" } });
  await recordTimeline(prisma, {
    factoryId: session.factoryId,
    workOrderId: jobCard.workOrderId,
    eventType: "STATUS_CHANGED",
    title: `${stageName(jobCard)} put on hold`,
    description: reason,
    actorId: session.userId,
    metadata: { jobCardId: jobCard.id },
  });

  revalidateStagePaths(session.factoryId, session.userId);
  return { success: true };
}

type ChecklistItemPayload = {
  checkpointId: string;
  ok?: boolean;
  remarks?: string;
  images?: StageImagePayload[];
};

export async function completeStage(jobCardId: string, payload: {
  beforeImages?: StageImagePayload[];
  afterImages?: StageImagePayload[];
  measurements?: string;
  materialNotes?: string;
  remarks?: string;
  checklist?: ChecklistItemPayload[];
}) {
  const session = await getUserSession();
  if (!session || !canWorkStage(session.role)) return { error: "Unauthorized" };

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: jobCardId, factoryId: session.factoryId },
    include: { stage: true, department: true, workOrder: true },
  });
  if (!jobCard) return { error: "Job card not found" };
  if (!(await canAccessJobCard(session, jobCard))) return { error: "This job card isn't assigned to you." };
  if (!ACTIVE_STAGE_STATUSES.includes(jobCard.status)) {
    return { error: `Stage cannot be completed from status ${jobCard.status}` };
  }
  if (stageIsQc(jobCard)) {
    return { error: "QC stages are completed through the inspection flow" };
  }

  if (stageReqPhoto(jobCard) && !(payload.afterImages?.length)) {
    return { error: `${stageName(jobCard)} requires at least one after-photo` };
  }
  if (stageReqRemarks(jobCard) && !payload.remarks?.trim()) {
    return { error: `${stageName(jobCard)} requires remarks` };
  }

  // If the department carries a checklist template, every checkpoint must be
  // cleared before the stage can complete — with per-checkpoint photo/remarks
  // when the checkpoint requires them (the same rules QC checkpoints use).
  const templateId = jobCard.department?.templateId ?? null;
  const checkpoints = templateId
    ? await prisma.checkpoint.findMany({
        where: { factoryId: session.factoryId, section: { templateId } },
        orderBy: { sortOrder: "asc" },
      })
    : [];
  const responseById = new Map((payload.checklist ?? []).map((c) => [c.checkpointId, c]));
  for (const cp of checkpoints) {
    const r = responseById.get(cp.id);
    if (!r?.ok) return { error: `Checklist: "${cp.name}" is not marked done` };
    if (cp.requireImage && !(r.images?.length)) {
      return { error: `Checklist: "${cp.name}" needs a photo` };
    }
    if (cp.requireRemarks && !r.remarks?.trim()) {
      return { error: `Checklist: "${cp.name}" needs a remark` };
    }
  }

  const uploadImages = async (images: StageImagePayload[] | undefined) => {
    const urls: string[] = [];
    for (const img of images ?? []) {
      if (!img.dataUrl) continue;
      const uploaded = await uploadStorageImage({
        path: createStoragePath({
          factoryId: session.factoryId,
          scope: "evidence",
          id: jobCard.id,
          fileName: img.fileName,
        }),
        dataUrl: img.dataUrl,
        fileName: img.fileName ?? "stage.jpg",
        mimeType: img.contentType ?? "image/jpeg",
        size: img.size ?? 0,
      });
      if (uploaded?.publicUrl) urls.push(uploaded.publicUrl);
    }
    return urls;
  };

  const beforeUrls = await uploadImages(payload.beforeImages);
  const afterUrls = await uploadImages(payload.afterImages);

  // Resolve the checklist with uploaded image URLs for the audit trail.
  const checklistResolved = checkpoints.length > 0
    ? await Promise.all(checkpoints.map(async (cp) => {
        const r = responseById.get(cp.id);
        return {
          checkpointId: cp.id,
          name: cp.name,
          ok: !!r?.ok,
          remarks: r?.remarks?.trim() || null,
          images: await uploadImages(r?.images),
        };
      }))
    : null;

  await prisma.stageEntry.create({
    data: {
      factoryId: session.factoryId,
      jobCardId: jobCard.id,
      submittedById: session.userId,
      beforeImages: beforeUrls,
      afterImages: afterUrls,
      measurements: payload.measurements?.trim() || null,
      materialNotes: payload.materialNotes?.trim() || null,
      remarks: payload.remarks?.trim() || null,
      checklist: checklistResolved ?? undefined,
      outcome: "SUBMITTED",
    },
  });

  // Approval gate: every non-QC worker stage submitted by a worker waits for
  // that department's supervisor. This is intentionally not configurable per
  // department: supervisors approve their own workers' production before the
  // chain advances.
  const actorIsApprover = session.role === "SUPERVISOR" || isOwnerRole(session.role);
  const supervisors = !actorIsApprover
    ? await prisma.user.findMany({
        where: { factoryId: session.factoryId, departmentId: jobCard.departmentId, role: "SUPERVISOR", isActive: true },
        select: { id: true },
      })
    : [];
  if (!actorIsApprover && supervisors.length > 0) {
    await prisma.jobCard.update({ where: { id: jobCard.id }, data: { status: "AWAITING_APPROVAL" } });
    for (const s of supervisors) {
      await prisma.notification.create({
        data: {
          factoryId: session.factoryId,
          userId: s.id,
          title: `${stageName(jobCard)} needs approval`,
          message: `${jobCardBatchLabel(jobCard)}: ${stageName(jobCard)} was submitted and is waiting for your approval.`,
          type: "ACTION_REQUIRED",
          linkUrl: `/supervisor/stage/${jobCard.id}`,
        },
      });
    }
    await recordTimeline(prisma, {
      factoryId: session.factoryId,
      workOrderId: jobCard.workOrderId,
      eventType: "STATUS_CHANGED",
      title: `${stageName(jobCard)} submitted — awaiting supervisor approval`,
      actorId: session.userId,
      metadata: { jobCardId: jobCard.id },
    });
    revalidateStagePaths(session.factoryId, session.userId);
    return { success: true, pendingApproval: true };
  }

  const { workOrderCompleted } = await advanceStageChain(jobCard, session.userId, session.factoryId, {
    remarks: payload.remarks?.trim() || undefined,
    beforeUrls,
    afterUrls,
    measurements: payload.measurements ?? null,
  });
  revalidateStagePaths(session.factoryId, session.userId);
  return { success: true, workOrderCompleted };
}

// Marks a stage card completed and advances the chain: unblocks the next stage
// (or finishes the work order + receives finished goods). Shared by the direct
// completion path and the supervisor-approval path.
async function advanceStageChain(
  jobCard: any,
  actorId: string,
  factoryId: string,
  meta: { remarks?: string; beforeUrls?: string[]; afterUrls?: string[]; measurements?: any } = {}
) {
  let workOrderCompleted = false;
  await prisma.$transaction(async (tx) => {
    await tx.jobCard.update({
      where: { id: jobCard.id },
      data: { status: "COMPLETED", completedAt: new Date(), completedQty: jobCard.targetQty, reworkReason: null },
    });

    const next = await tx.jobCard.findFirst({
      where: { workOrderId: jobCard.workOrderId, sequence: { gt: jobCard.sequence }, status: { not: "COMPLETED" } },
      orderBy: { sequence: "asc" },
      include: { stage: true, department: true },
    });

    if (next) {
      await tx.jobCard.update({ where: { id: next.id }, data: { status: "WAITING" } });
      if (next.assignedToId) {
        await tx.notification.create({
          data: {
            factoryId,
            userId: next.assignedToId,
            title: `${stageName(next)} ready`,
            message: `${jobCardBatchLabel(jobCard)}: ${stageName(jobCard)} is done — ${stageName(next)} can start.`,
            type: "ACTION_REQUIRED",
            linkUrl: stageIsQc(next) ? `/worker/inspection/${next.id}` : `/worker/stage/${next.id}`,
          },
        });
      }
    } else {
      await tx.workOrder.update({
        where: { id: jobCard.workOrderId },
        data: { status: "COMPLETED", producedQty: jobCard.targetQty, endDate: new Date() },
      });
      await tx.productionPlan.update({
        where: { id: jobCard.workOrder.productionPlanId },
        data: { status: "COMPLETED" },
      });
      workOrderCompleted = true;
    }

    await recordTimeline(tx, {
      factoryId,
      workOrderId: jobCard.workOrderId,
      eventType: "STATUS_CHANGED",
      title: `${stageName(jobCard)} completed`,
      description: meta.remarks || undefined,
      actorId,
      metadata: { jobCardId: jobCard.id, stage: stageName(jobCard), beforeImages: meta.beforeUrls, afterImages: meta.afterUrls, measurements: meta.measurements ?? null },
    });

    await tx.auditLog.create({
      data: {
        factoryId,
        actorUserId: actorId,
        action: `${stageName(jobCard)} completed for ${jobCardBatchLabel(jobCard)}`,
        entityType: "JobCard",
        entityId: jobCard.id,
      },
    });
  }, { timeout: 30000, maxWait: 10000 });

  // Finished goods land in stock when the LAST stage completes (usually Packing).
  if (workOrderCompleted) {
    try {
      const plan = await prisma.productionPlan.findUnique({
        where: { id: jobCard.workOrder.productionPlanId },
        include: { blueprintVersion: { include: { blueprint: true } } },
      });
      if (plan) {
        await receiveFinishedGoods({
          factoryId,
          workOrderId: jobCard.workOrderId,
          productVariantId: plan.blueprintVersion.blueprint.productVariantId,
          quantity: jobCard.targetQty,
        });
      }
    } catch (error) {
      console.error("Finished goods receipt failed:", error);
    }
  }

  return { workOrderCompleted };
}

// Supervisor (or owner) approves a stage that was submitted by a worker and is
// waiting for sign-off, advancing the chain.
export async function approveStageCard(jobCardId: string) {
  const session = await getUserSession();
  if (!session || !(session.role === "SUPERVISOR" || isOwnerRole(session.role))) return { error: "Unauthorized" };

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: jobCardId, factoryId: session.factoryId },
    include: { stage: true, department: true, workOrder: true },
  });
  if (!jobCard) return { error: "Job card not found" };
  if (!(await canAccessJobCard(session, jobCard))) return { error: "This stage is in another department." };
  if (jobCard.status !== "AWAITING_APPROVAL") return { error: "This stage is not awaiting approval" };

  // Mark the latest submission approved for the audit trail.
  const latest = await prisma.stageEntry.findFirst({
    where: { jobCardId: jobCard.id }, orderBy: { createdAt: "desc" },
  });
  if (latest) await prisma.stageEntry.update({ where: { id: latest.id }, data: { outcome: "APPROVED" } });

  const { workOrderCompleted } = await advanceStageChain(jobCard, session.userId, session.factoryId, {});
  revalidateStagePaths(session.factoryId, session.userId);
  return { success: true, workOrderCompleted };
}

// Supervisor (or owner) rejects a submitted stage, sending it back for rework.
export async function rejectStageCard(jobCardId: string, reason: string) {
  const session = await getUserSession();
  if (!session || !(session.role === "SUPERVISOR" || isOwnerRole(session.role))) return { error: "Unauthorized" };
  if (!reason?.trim()) return { error: "A rework reason is required" };

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: jobCardId, factoryId: session.factoryId },
    include: { stage: true, department: true },
  });
  if (!jobCard) return { error: "Job card not found" };
  if (!(await canAccessJobCard(session, jobCard))) return { error: "This stage is in another department." };
  if (jobCard.status !== "AWAITING_APPROVAL") return { error: "This stage is not awaiting approval" };

  await prisma.$transaction(async (tx) => {
    await tx.jobCard.update({
      where: { id: jobCard.id },
      data: { status: "REWORK_REQUIRED", reworkReason: reason.trim() },
    });
    const latest = await tx.stageEntry.findFirst({ where: { jobCardId: jobCard.id }, orderBy: { createdAt: "desc" } });
    if (latest) await tx.stageEntry.update({ where: { id: latest.id }, data: { outcome: "REWORK" } });
    if (jobCard.assignedToId) {
      await tx.notification.create({
        data: {
          factoryId: session.factoryId,
          userId: jobCard.assignedToId,
          title: `${stageName(jobCard)} sent back`,
          message: `${jobCardBatchLabel(jobCard)}: your ${stageName(jobCard)} submission needs rework — ${reason.trim()}`,
          type: "ACTION_REQUIRED",
          linkUrl: `/worker/stage/${jobCard.id}`,
        },
      });
    }
    await recordTimeline(tx, {
      factoryId: session.factoryId,
      workOrderId: jobCard.workOrderId,
      eventType: "REJECTED",
      title: `${stageName(jobCard)} rejected by supervisor — rework required`,
      description: reason.trim(),
      actorId: session.userId,
      metadata: { jobCardId: jobCard.id },
    });
  }, { timeout: 30000, maxWait: 10000 });

  revalidateStagePaths(session.factoryId, session.userId);
  return { success: true };
}

// Admin override: force-complete a stage with a mandatory remark. Highlighted
// in the timeline per the PRD's governance rules.
export async function overrideStage(jobCardId: string, remark: string) {
  const session = await getUserSession();
  if (!session || !isOwnerRole(session.role)) return { error: "Unauthorized" };
  if (!remark?.trim()) return { error: "Override requires a remark" };

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: jobCardId, factoryId: session.factoryId },
    include: { stage: true, department: true, workOrder: true },
  });
  if (!jobCard) return { error: "Job card not found" };
  if (jobCard.status === "COMPLETED") return { error: "Stage is already completed" };

  await prisma.$transaction(async (tx) => {
    await tx.stageEntry.create({
      data: {
        factoryId: session.factoryId,
        jobCardId: jobCard.id,
        submittedById: session.userId,
        remarks: `[ADMIN OVERRIDE] ${remark.trim()}`,
        outcome: "APPROVED",
      },
    });
    await tx.jobCard.update({
      where: { id: jobCard.id },
      data: { status: "COMPLETED", completedAt: new Date(), completedQty: jobCard.targetQty, reworkReason: null },
    });
    const next = await tx.jobCard.findFirst({
      where: { workOrderId: jobCard.workOrderId, sequence: { gt: jobCard.sequence }, status: { not: "COMPLETED" } },
      orderBy: { sequence: "asc" },
    });
    if (next) {
      await tx.jobCard.update({ where: { id: next.id }, data: { status: "WAITING" } });
    }
    await recordTimeline(tx, {
      factoryId: session.factoryId,
      workOrderId: jobCard.workOrderId,
      eventType: "APPROVED",
      title: `OVERRIDE: ${stageName(jobCard)} force-completed by admin`,
      description: remark.trim(),
      actorId: session.userId,
      metadata: { jobCardId: jobCard.id, override: true },
    });
    await tx.auditLog.create({
      data: {
        factoryId: session.factoryId,
        actorUserId: session.userId,
        action: `Admin override: force-completed ${stageName(jobCard)} for ${jobCardBatchLabel(jobCard)}`,
        entityType: "JobCard",
        entityId: jobCard.id,
        metadata: { remark: remark.trim() },
      },
    });
  }, { timeout: 30000, maxWait: 10000 });

  revalidateStagePaths(session.factoryId, session.userId);
  return { success: true };
}
