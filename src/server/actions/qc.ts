"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { getActiveSessionUser } from "@/lib/server/session-user";
import { emitEvent, ownerRecipients, supervisorRecipients } from "@/lib/server/events";
import { jobCardBatchLabel } from "@/lib/server/jobCardAdapter";
import { revalidatePath } from "next/cache";
import { QC_FAIL_THRESHOLD, isFailingQcScore, qcAuditScore } from "@/lib/qc-score";

import { guardModuleWrite } from "@/platform/modules/guard";

/**
 * Alert the owner and every active supervisor that an audit scored below the pass
 * mark.
 *
 * `factoryId` comes from the session and never from an argument. This is a
 * `"use server"` module, so every export here is a public POST endpoint — an
 * argument-supplied tenant id would let anyone push notifications into any
 * workspace.
 *
 * Never throws and returns rather than propagating: the caller has already
 * committed the audit, and a failed fan-out must not undo a worker's submission.
 */
export async function reportQcAuditScore(inspectionId: string) {
  const session = await getActiveSessionUser();
  if (!session) return { error: "Unauthorized" };
  await guardModuleWrite("quality");
  const { factoryId } = session;

  try {
    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, factoryId },
      select: {
        id: true,
        submissions: { select: { passFail: true } },
        jobCard: {
          select: {
            sequence: true,
            department: { select: { name: true } },
            stage: { select: { name: true } },
            workOrder: { select: { woNumber: true } },
          },
        },
      },
    });
    if (!inspection) return { error: "Inspection not found" };

    const result = qcAuditScore(inspection.submissions);
    // Read before the guard: the predicate narrows `result` to null on the way
    // out, and a passing audit's score is still worth returning to the caller.
    const score = result?.score ?? null;
    if (!isFailingQcScore(result)) {
      return { success: true, score, alerted: false };
    }

    const label = jobCardBatchLabel({
      workOrder: inspection.jobCard?.workOrder ?? null,
      sequence: inspection.jobCard?.sequence ?? 0,
    });
    const where =
      inspection.jobCard?.stage?.name ?? inspection.jobCard?.department?.name ?? "production";

    // Owners and every supervisor. emitEvent de-duplicates, so a supervisor who
    // is also an owner-side user gets one notification, not two.
    const recipients = [
      ...(await ownerRecipients(factoryId)),
      ...(await supervisorRecipients(factoryId)),
    ].filter((id) => id !== session.id);

    const { delivered } = await emitEvent({
      factoryId,
      event: "QC_SCORE_LOW",
      recipients,
      title: `QC audit failed — ${result.score}%`,
      message: `${label} scored ${result.score}% at ${where} (${result.failed} of ${
        result.passed + result.failed
      } checkpoints failed). Pass mark is ${QC_FAIL_THRESHOLD}%.`,
      linkUrl: `/inspector/review/${inspection.id}`,
      type: "ACTION_REQUIRED",
      actorId: session.id,
    });

    return { success: true, score: result.score, alerted: delivered > 0 };
  } catch (error) {
    console.error("QC audit score alert failed:", error);
    return { error: "Failed to report QC audit score" };
  }
}

export async function passQC(jobCardId: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  await guardModuleWrite("quality");

  try {
    // Scoped by factory: an id is guessable, and without this filter a QC pass
    // could be applied to another tenant's job card.
    const jobCard = await prisma.jobCard.findFirst({
      where: { id: jobCardId, factoryId: owner.factoryId },
      include: { workOrder: true }
    });

    if (!jobCard || jobCard.status !== "QC_PENDING") return { error: "Job card not pending QC" };

    // Mark current job card as COMPLETED
    await prisma.jobCard.update({
      where: { id: jobCardId },
      data: { status: "COMPLETED", completedQty: jobCard.targetQty }
    });

    // Check if there is a next job card in the sequence
    const nextJobCard = await prisma.jobCard.findFirst({
      where: {
        workOrderId: jobCard.workOrderId,
        sequence: jobCard.sequence + 1
      }
    });

    if (nextJobCard) {
      // Unblock the next step
      await prisma.jobCard.update({
        where: { id: nextJobCard.id },
        data: { status: "WAITING" }
      });
    } else {
      // If there is no next job card, the Work Order is complete
      await prisma.workOrder.update({
        where: { id: jobCard.workOrderId },
        data: { status: "COMPLETED", producedQty: jobCard.targetQty }
      });
      
      // Update the production plan as well
      await prisma.productionPlan.update({
        where: { id: jobCard.workOrder.productionPlanId },
        data: { status: "COMPLETED" }
      });
    }

    revalidatePath("/owner/qc-floor");
    revalidatePath("/owner/floor");
    revalidatePath("/owner/dashboard");
    revalidatePath("/owner/inventory");
    return { success: true };
  } catch (error) {
    console.error("Error passing QC:", error);
    return { error: "Failed to pass QC" };
  }
}
