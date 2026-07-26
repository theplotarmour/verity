"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";

export async function passQC(jobCardId: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    const jobCard = await prisma.jobCard.findUnique({
      where: { id: jobCardId },
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
