"use server";

import { revalidatePath } from "next/cache";
import type { QCStatus } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleAction } from "@/platform/modules/guard";

/**
 * Running a checklist against a completed site visit.
 *
 * The checkpoint definitions are the same rows production QC uses — one
 * `ChecklistTemplate`, one set of `Checkpoint`s. Only the answers are stored
 * separately, on `ServiceCheckpointSubmission`, because the production
 * `Inspection` is anchored to a JobCard that a site visit does not have.
 *
 * **Guarded on `quality`, not `helpdesk`.** These actions were gated behind
 * helpdesk — presumably copied from the ticket actions they sit beside — and
 * neither franchise pack carries that module. The effect was silent and total:
 * a QSR or Retail tenant could not create or complete a single audit, while
 * their dashboard cheerfully rendered an SOP panel reading rows that could
 * never exist. An inspection is a quality function, and `quality` is in all
 * four packs.
 */

function revalidateInspectionPaths(siteId?: string | null) {
  revalidatePath("/owner/service-work-orders");
  if (siteId) revalidatePath(`/owner/sites/${siteId}`);
}

/**
 * The inspection with its checklist expanded into sections and checkpoints,
 * each carrying whatever answer has been recorded so far.
 */
export async function getServiceInspection(inspectionId: string) {
  await guardModuleAction("quality");
  const user = await getOwnerUser();
  if (!user) return null;

  const inspection = await prisma.serviceInspection.findFirst({
    where: { id: inspectionId, factoryId: user.factoryId },
    include: {
      serviceWorkOrder: {
        select: { id: true, woNumber: true, title: true, siteId: true },
      },
      site: { select: { id: true, name: true } },
      checklist: {
        select: {
          id: true,
          name: true,
          sections: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              checkpoints: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  name: true,
                  instructions: true,
                  inputType: true,
                  placeholder: true,
                  isRequired: true,
                  requireImage: true,
                  requireRemarks: true,
                },
              },
            },
          },
        },
      },
      submissions: true,
    },
  });
  if (!inspection) return null;

  const answers = new Map(inspection.submissions.map((s) => [s.checkpointId, s]));

  return {
    id: inspection.id,
    status: inspection.status,
    notes: inspection.notes,
    startedAt: inspection.startedAt.toISOString(),
    submittedAt: inspection.submittedAt?.toISOString() ?? null,
    approvedAt: inspection.approvedAt?.toISOString() ?? null,
    workOrder: inspection.serviceWorkOrder,
    siteName: inspection.site?.name ?? null,
    checklistName: inspection.checklist.name,
    sections: inspection.checklist.sections.map((section) => ({
      id: section.id,
      title: section.title,
      checkpoints: section.checkpoints.map((cp) => {
        const answer = answers.get(cp.id);
        return {
          ...cp,
          passFail: answer?.passFail ?? null,
          value: answer?.value ?? null,
          remarks: answer?.remarks ?? null,
          answered: !!answer?.completedAt,
        };
      }),
    })),
  };
}

/** Record or update one checkpoint answer. Idempotent per checkpoint. */
export async function recordServiceCheckpoint(input: {
  inspectionId: string;
  checkpointId: string;
  passFail?: string | null;
  value?: string | null;
  remarks?: string | null;
}) {
  await guardModuleAction("quality");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const inspection = await prisma.serviceInspection.findFirst({
    where: { id: input.inspectionId, factoryId: user.factoryId },
    select: { id: true, status: true, siteId: true, checklistId: true },
  });
  if (!inspection) return { error: "Inspection not found." };
  if (inspection.status === "APPROVED") {
    return { error: "This inspection is approved and can no longer be edited." };
  }

  // The checkpoint must belong to this inspection's checklist. Without this a
  // crafted id could attach an answer from another template — or another
  // tenant's — to this record.
  const checkpoint = await prisma.checkpoint.findFirst({
    where: {
      id: input.checkpointId,
      factoryId: user.factoryId,
      section: { templateId: inspection.checklistId },
    },
    select: { id: true },
  });
  if (!checkpoint) return { error: "That checkpoint is not on this checklist." };

  const data = {
    passFail: input.passFail ?? null,
    value: input.value?.trim() || null,
    remarks: input.remarks?.trim() || null,
    completedAt: new Date(),
  };

  await prisma.serviceCheckpointSubmission.upsert({
    where: {
      inspectionId_checkpointId: {
        inspectionId: inspection.id,
        checkpointId: checkpoint.id,
      },
    },
    create: {
      factoryId: user.factoryId,
      inspectionId: inspection.id,
      checkpointId: checkpoint.id,
      ...data,
    },
    update: data,
  });

  revalidateInspectionPaths(inspection.siteId);
  return { success: true };
}

/**
 * Submit for sign-off. Refuses while a required checkpoint is unanswered —
 * a partially completed checklist that reads as "submitted" is worse than one
 * that is plainly still open.
 */
export async function submitServiceInspection(inspectionId: string, notes?: string | null) {
  await guardModuleAction("quality");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const inspection = await prisma.serviceInspection.findFirst({
    where: { id: inspectionId, factoryId: user.factoryId },
    select: {
      id: true,
      siteId: true,
      checklistId: true,
      submissions: { select: { checkpointId: true, completedAt: true } },
    },
  });
  if (!inspection) return { error: "Inspection not found." };

  const required = await prisma.checkpoint.findMany({
    where: {
      factoryId: user.factoryId,
      isRequired: true,
      section: { templateId: inspection.checklistId },
    },
    select: { id: true },
  });
  const answered = new Set(
    inspection.submissions.filter((s) => s.completedAt).map((s) => s.checkpointId),
  );
  const missing = required.filter((cp) => !answered.has(cp.id)).length;
  if (missing > 0) {
    return { error: `${missing} required checkpoint${missing === 1 ? "" : "s"} still unanswered.` };
  }

  await prisma.serviceInspection.update({
    where: { id: inspection.id },
    data: {
      status: "WAITING_QC",
      submittedAt: new Date(),
      notes: notes?.trim() || null,
    },
  });

  revalidateInspectionPaths(inspection.siteId);
  return { success: true };
}

/** Approve or reject a submitted inspection. */
export async function resolveServiceInspection(
  inspectionId: string,
  decision: Extract<QCStatus, "APPROVED" | "REJECTED" | "REWORK_REQUIRED">,
) {
  await guardModuleAction("quality");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const inspection = await prisma.serviceInspection.findFirst({
    where: { id: inspectionId, factoryId: user.factoryId },
    select: { id: true, siteId: true },
  });
  if (!inspection) return { error: "Inspection not found." };

  await prisma.serviceInspection.update({
    where: { id: inspection.id },
    data: {
      status: decision,
      approvedAt: decision === "APPROVED" ? new Date() : null,
      approvedById: decision === "APPROVED" ? user.id : null,
    },
  });

  revalidateInspectionPaths(inspection.siteId);
  return { success: true };
}
