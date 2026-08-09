import { getMasterData, getRunningOrders } from "@/server/actions/orders"
import { OrdersClient } from "./client"
import { redirect } from "next/navigation"
import prisma from '@/lib/prisma'
import { jobCardInclude, toWorkerJob } from '@/lib/server/jobCardAdapter'
import { getOwnerUser } from '@/lib/server/owner'

export default async function OwnerOrdersPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect('/onboarding');
  
  const factoryId = dbUser.factoryId;

  const [data, runningOrders, inspections, template] = await Promise.all([
    getMasterData(),
    getRunningOrders(),
    prisma.inspection.findMany({
      where: { factoryId },
      include: {
        jobCard: { include: jobCardInclude },
        submissions: {
          include: { checkpoint: true }
        },
        report: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    }).then((rows) => rows.map((row) => ({ ...row, batch: toWorkerJob(row.jobCard) }))),
    prisma.checklistTemplate.findFirst({
      where: { factoryId, isLatest: true, status: 'active' },
      include: {
        sections: {
          include: { checkpoints: true }
        }
      }
    })
  ])
  
  const totalCheckpoints = template?.sections.reduce((acc: number, s: any) => acc + s.checkpoints.length, 0) || 1;
  
  if (!data) {
    redirect('/')
  }

  return (
    <OrdersClient
      data={data}
      factoryId={factoryId}
      runningOrders={runningOrders}
      inspections={inspections}
      totalCheckpoints={totalCheckpoints}
      userRole={dbUser.role}
    />
  )
}
