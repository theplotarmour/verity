import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Destructive maintenance endpoint: require an explicit token so it can
  // never be triggered by a stray crawler hit.
  const token = request.nextUrl.searchParams.get("token");
  if (!process.env.MAINTENANCE_TOKEN || token !== process.env.MAINTENANCE_TOKEN) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting deletion of all production records from API...");

    // Delete in correct dependency order
    const deletedImageEvidence = await prisma.imageEvidence.deleteMany({});
    const deletedSubmissions = await prisma.checkpointSubmission.deleteMany({});
    const deletedApprovals = await prisma.qualityApproval.deleteMany({});
    const deletedReports = await prisma.qualityReport.deleteMany({});
    const deletedInspections = await prisma.inspection.deleteMany({});
    const deletedJobCards = await prisma.jobCard.deleteMany({});
    const deletedWorkOrders = await prisma.workOrder.deleteMany({});
    const deletedPlans = await prisma.productionPlan.deleteMany({});
    const deletedOrderItems = await prisma.salesOrderItem.deleteMany({});
    const deletedOrders = await prisma.salesOrder.deleteMany({});

    return NextResponse.json({
      success: true,
      message: "Successfully deleted all production records",
      details: {
        imageEvidence: deletedImageEvidence.count,
        checkpointSubmissions: deletedSubmissions.count,
        qualityApprovals: deletedApprovals.count,
        qualityReports: deletedReports.count,
        inspections: deletedInspections.count,
        jobCards: deletedJobCards.count,
        workOrders: deletedWorkOrders.count,
        productionPlans: deletedPlans.count,
        salesOrderItems: deletedOrderItems.count,
        salesOrders: deletedOrders.count,
      }
    });
  } catch (error: any) {
    console.error("API Deletion Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to delete records"
    }, { status: 500 });
  }
}
