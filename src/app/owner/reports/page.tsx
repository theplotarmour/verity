import prisma from "@/lib/prisma"
import { jobCardInclude, toWorkerJob } from "@/lib/server/jobCardAdapter"
import { getOwnerUser } from "@/lib/server/owner"
import { getReportsData } from "@/server/actions/reports"
import { redirect } from "next/navigation"
import { ReportsPackClient } from "./ReportsPackClient"

export default async function OwnerReportsPage() {
  const owner = await getOwnerUser()
  if (!owner) redirect('/')

  const [passports, reportsData] = await Promise.all([
    prisma.qualityReport.findMany({
      where: { factoryId: owner.factoryId },
      include: {
        inspection: {
          include: {
            jobCard: { include: jobCardInclude }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).then((rows) => rows.map((row) => ({
      ...row,
      inspection: { ...row.inspection, batch: toWorkerJob(row.inspection.jobCard) },
    }))),
    getReportsData(),
  ]);

  return <ReportsPackClient initialData={reportsData} passports={passports} />
}
