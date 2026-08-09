import { Badge, Card } from "@/components/ui/primitives"
import { getStatusClasses, titleCaseStatus } from "@/lib/utils"
import { getUserSession } from "@/lib/server/auth"
import prisma from "@/lib/prisma"
import { jobCardInclude, toWorkerJob } from "@/lib/server/jobCardAdapter"
import { redirect } from "next/navigation"

export default async function InspectorRejectedPage() {
  const session = await getUserSession()
  if (!session || (session.role !== 'SUPERVISOR' && session.role !== 'OWNER')) redirect('/')

  const jobCards = await prisma.jobCard.findMany({
    where: {
      factoryId: session.factoryId,
      status: "REWORK_REQUIRED"
    },
    include: jobCardInclude,
    orderBy: { createdAt: 'desc' }
  })
  const reworkItems = jobCards.map((jobCard) => toWorkerJob(jobCard))

  if (reworkItems.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-base font-bold text-text-primary">✓ No Issues Yet</p>
          <p className="text-xs text-text-secondary mt-1">All batches are clean. No rework is pending.</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {reworkItems.map((batch: any) => (
        <Card key={batch.id}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-text-primary">
                {batch.batchNumber}
              </p>
              <p className="mt-1 text-sm text-text-secondary">{batch.order.itemName || batch.order.productName || batch.order.orderNumber}</p>
            </div>
            <Badge className={getStatusClasses(batch.status as any)}>
              {titleCaseStatus(batch.status as any)}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  )
}
