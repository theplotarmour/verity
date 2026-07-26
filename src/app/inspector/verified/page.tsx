import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Button, Card } from "@/components/ui/primitives"
import { formatDate } from "@/lib/utils"
import { getUserSession } from "@/lib/server/auth"
import prisma from "@/lib/prisma"
import { jobCardBatchLabel } from "@/lib/server/jobCardAdapter"
import { redirect } from "next/navigation"

export default async function InspectorVerifiedPage() {
  const session = await getUserSession()
  if (!session || (session.role !== 'SUPERVISOR' && session.role !== 'OWNER')) redirect('/')

  const rawReports = await prisma.qualityReport.findMany({
    where: {
      factoryId: session.factoryId,
    },
    include: {
      inspection: {
        include: {
          jobCard: { include: { workOrder: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  const verifiedReports = rawReports.map((report) => ({
    ...report,
    inspection: {
      ...report.inspection,
      batch: { batchNumber: jobCardBatchLabel(report.inspection.jobCard) },
    },
  }))

  return (
    <div className="space-y-4">
      {verifiedReports.map((report) => {
        return (
          <Card key={report.id}>
            <p className="text-lg font-semibold text-text-primary">
              {report.inspection?.batch?.batchNumber}
            </p>
            <p className="mt-1 text-sm text-text-secondary">{report.verificationCode}</p>
            <p className="mt-2 text-sm text-text-secondary">
              Approved {formatDate(report.createdAt.toString())}
            </p>
            <Link href={`/verify/${report.verificationCode}`} className="mt-4 block">
              <Button className="w-full">
                Open proof page
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </Card>
        )
      })}
    </div>
  )
}
