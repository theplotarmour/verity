import prisma from '@/lib/prisma'
import { getOwnerUser } from '@/lib/server/owner'
import { redirect } from 'next/navigation'
import { QCFloorClient } from './client'
import { canUser } from "@/lib/server/permissions";
import { jobCardInclude, toWorkerJob } from '@/lib/server/jobCardAdapter'

export default async function QCFloorPage() {
  const dbUser = await getOwnerUser();
  if (!dbUser) redirect('/onboarding');
  if (!(await canUser(dbUser, 'QC_QUEUE'))) redirect('/unauthorized');

  const factoryId = dbUser.factoryId;

  const [inspections, template, workers, inspectors, passports] = await Promise.all([
    prisma.inspection.findMany({
      relationLoadStrategy: "join",
      where: { factoryId },
      include: {
        jobCard: { include: jobCardInclude },
        submissions: { include: { checkpoint: true } },
        report: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }).then((rows) => rows.map((row) => ({ ...row, batch: toWorkerJob(row.jobCard) }))),
    prisma.checklistTemplate.findFirst({
      where: { factoryId, isLatest: true, status: 'active' },
      include: { sections: { include: { checkpoints: true } } },
    }),
    prisma.user.findMany({ where: { factoryId, role: 'WORKER', isActive: true }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { factoryId, role: 'SUPERVISOR', isActive: true }, select: { id: true, name: true } }),
    // Completed tab: verified passports, same source as Reports → Passports.
    prisma.qualityReport.findMany({
      where: { factoryId },
      include: { inspection: { include: { jobCard: { include: jobCardInclude } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }).then((rows) => rows.map((row) => ({
      ...row,
      inspection: { ...row.inspection, batch: toWorkerJob(row.inspection.jobCard) },
    }))),
  ]);

  const totalCheckpoints = template?.sections.reduce((acc: number, s: any) => acc + s.checkpoints.length, 0) || 1;

  return (
    <QCFloorClient
      inspections={inspections}
      workers={workers}
      inspectors={inspectors}
      totalCheckpoints={totalCheckpoints}
      passports={passports}
    />
  );
}
