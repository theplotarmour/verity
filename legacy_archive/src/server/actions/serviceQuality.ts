"use server";

import { revalidatePath } from "next/cache";
import type { QCStatus } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";

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
          photoUrl: answer?.photoUrl ?? null,
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
  /**
   * Evidence. The column existed from the start and nothing ever wrote to it,
   * which made `Checkpoint.requireImage` a setting with no effect — a hygiene
   * or visual-standards audit that cannot carry a photo is an assertion, not a
   * record.
   */
  photoUrl?: string | null;
}) {
  await guardModuleWrite("quality");
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
    // `undefined` leaves an existing photo alone; an explicit null clears it.
    // Answering a checkpoint again should not silently drop the evidence
    // attached to it the first time.
    ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl || null } : {}),
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
  await guardModuleWrite("quality");
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const inspection = await prisma.serviceInspection.findFirst({
    where: { id: inspectionId, factoryId: user.factoryId },
    select: {
      id: true,
      siteId: true,
      checklistId: true,
      submissions: { select: { checkpointId: true, completedAt: true, photoUrl: true } },
    },
  });
  if (!inspection) return { error: "Inspection not found." };

  const checkpoints = await prisma.checkpoint.findMany({
    where: {
      factoryId: user.factoryId,
      section: { templateId: inspection.checklistId },
    },
    select: { id: true, name: true, isRequired: true, requireImage: true },
  });

  const answered = new Set(
    inspection.submissions.filter((s) => s.completedAt).map((s) => s.checkpointId),
  );
  const missing = checkpoints.filter((cp) => cp.isRequired && !answered.has(cp.id));
  if (missing.length > 0) {
    return {
      error: `${missing.length} required checkpoint${missing.length === 1 ? "" : "s"} still unanswered.`,
    };
  }

  // `requireImage` was a setting nothing enforced, because nothing could write
  // a photo. Now that a photo can be attached, an audit that demands evidence
  // and accepts none would be worse than one that never asked.
  const photos = new Map(inspection.submissions.map((s) => [s.checkpointId, s.photoUrl]));
  const withoutPhoto = checkpoints.filter(
    (cp) => cp.requireImage && answered.has(cp.id) && !photos.get(cp.id),
  );
  if (withoutPhoto.length > 0) {
    const names = withoutPhoto.slice(0, 3).map((cp) => cp.name).join(", ");
    return {
      error: `A photo is required for: ${names}${withoutPhoto.length > 3 ? `, and ${withoutPhoto.length - 3} more` : ""}.`,
    };
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
  // A write, despite the `resolve` prefix — this approves or rejects an
  // inspection. Name-based classification is auditable by eye, which is how this
  // one and `resolveSwap` were caught.
  await guardModuleWrite("quality");
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
