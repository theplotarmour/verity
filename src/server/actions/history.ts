"use server";

import prisma from "@/lib/prisma";
import { getUserSession } from "@/lib/server/auth";
import { jobCardInclude, toWorkerJob } from "@/lib/server/jobCardAdapter";
import { canAccessJobCard, getSessionDepartmentId, isOwnerRole } from "@/lib/server/jobCardAccess";

// Work history for floor staff.
//
//   Worker     → the cards assigned to them.
//   Supervisor → every card in the department they run.
//   Management → the whole factory.
//
// Grouped into the buckets an operator actually thinks in, rather than raw
// JobCard status strings.

export type HistoryBucket = "active" | "awaiting" | "completed" | "rework";

const BUCKET_OF: Record<string, HistoryBucket> = {
  WAITING: "active",
  IN_PROGRESS: "active",
  ON_HOLD: "active",
  BLOCKED: "active",
  AWAITING_APPROVAL: "awaiting",
  QC_PENDING: "awaiting",
  REWORK_REQUIRED: "rework",
  COMPLETED: "completed",
};

export async function getWorkHistory() {
  const session = await getUserSession();
  if (!session) return { jobs: [], scope: "none" as const };

  const isOwner = isOwnerRole(session.role);
  const isSupervisor = session.role === "SUPERVISOR";
  if (!isOwner && !isSupervisor && session.role !== "WORKER") {
    return { jobs: [], scope: "none" as const };
  }

  const where = isOwner
    ? { factoryId: session.factoryId }
    : isSupervisor
      ? { factoryId: session.factoryId, departmentId: (await getSessionDepartmentId(session)) ?? "__none__" }
      : { factoryId: session.factoryId, assignedToId: session.userId };

  const jobCards = await prisma.jobCard.findMany({
    where,
    include: {
      ...jobCardInclude,
      department: { select: { id: true, name: true, isQcStage: true } },
      stage: true,
      assignedTo: { select: { id: true, name: true } },
      inspection: { select: { id: true, status: true } },
    },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  const jobs = jobCards.map((jc: any) => {
    const shaped = toWorkerJob(jc, jc.assignedTo ?? null);
    return {
      ...shaped,
      bucket: BUCKET_OF[jc.status] ?? "active",
      departmentName: jc.department?.name ?? jc.stage?.name ?? null,
      isQcStage: !!(jc.department?.isQcStage || jc.stage?.isQcStage),
      inspectionId: jc.inspection?.id ?? null,
      workerName: jc.assignedTo?.name ?? null,
      completedAt: jc.completedAt ?? null,
      startedAt: jc.startedAt ?? null,
    };
  });

  return { jobs, scope: isOwner ? ("factory" as const) : isSupervisor ? ("department" as const) : ("own" as const) };
}

/** One job card in full: the order spec, every submission and its photos. */
export async function getHistoryDetail(jobCardId: string) {
  const session = await getUserSession();
  if (!session) return null;

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: jobCardId, factoryId: session.factoryId },
    include: {
      ...jobCardInclude,
      department: { select: { id: true, name: true, isQcStage: true } },
      stage: true,
      assignedTo: { select: { id: true, name: true } },
      stageEntries: { orderBy: { createdAt: "desc" } },
      inspection: {
        include: {
          submissions: {
            include: { checkpoint: { select: { id: true, name: true } }, evidences: true },
          },
          report: true,
        },
      },
    },
  });
  if (!jobCard) return null;
  if (!(await canAccessJobCard(session, jobCard))) return null;

  // StageEntry.submittedById is a plain string (no relation) — resolve the
  // submitter names for the whole set in one query.
  const entries: any[] = (jobCard as any).stageEntries ?? [];
  const submitterIds = [...new Set(entries.map((e) => e.submittedById).filter(Boolean))] as string[];
  const submitters = submitterIds.length
    ? new Map((await prisma.user.findMany({ where: { id: { in: submitterIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]))
    : new Map<string, string>();

  const shaped = toWorkerJob(jobCard, (jobCard as any).assignedTo ?? null);
  return {
    ...shaped,
    departmentName: (jobCard as any).department?.name ?? (jobCard as any).stage?.name ?? null,
    isQcStage: !!((jobCard as any).department?.isQcStage || (jobCard as any).stage?.isQcStage),
    workerName: (jobCard as any).assignedTo?.name ?? null,
    entries: entries.map((e) => ({ ...e, submittedBy: e.submittedById ? { id: e.submittedById, name: submitters.get(e.submittedById) ?? "Worker" } : null })),
    inspection: (jobCard as any).inspection ?? null,
    startedAt: jobCard.startedAt,
    completedAt: jobCard.completedAt,
  };
}
