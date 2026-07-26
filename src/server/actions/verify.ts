'use server'

import prisma from '@/lib/prisma'

import { jobCardInclude, toWorkerJob } from '@/lib/server/jobCardAdapter'

export async function getPassportData(verificationCode: string) {
  const report = await prisma.qualityReport.findUnique({
    where: { verificationCode },
    include: {
      inspection: {
        include: {
          jobCard: { include: jobCardInclude },
          approval: true,
          submissions: {
            include: { checkpoint: true, evidences: true }
          }
        }
      }
    }
  })

  if (!report) return null

  const [factory, inspector] = await Promise.all([
    prisma.factory.findUnique({ where: { id: report.factoryId } }),
    report.inspection.approval
      ? prisma.user.findUnique({
          where: { id: report.inspection.approval.inspectorId },
          select: { id: true, name: true },
        })
      : Promise.resolve(null),
  ])

  const batch = toWorkerJob(report.inspection.jobCard)
  batch.order.inspector = inspector

  // Attach the uploader's name to each evidence photo for the passport gallery.
  const uploaderIds = [
    ...new Set(
      report.inspection.submissions.flatMap((s: any) =>
        (s.evidences ?? []).map((e: any) => e.uploadedById).filter(Boolean)
      )
    ),
  ] as string[]
  const uploaders = uploaderIds.length
    ? await prisma.user.findMany({ where: { id: { in: uploaderIds } }, select: { id: true, name: true } })
    : []
  const uploaderName = new Map(uploaders.map((u) => [u.id, u.name]))
  const submissions = report.inspection.submissions.map((s: any) => ({
    ...s,
    evidences: (s.evidences ?? []).map((e: any) => ({
      ...e,
      uploadedByName: e.uploadedById ? uploaderName.get(e.uploadedById) ?? null : null,
    })),
  }))

  return {
    ...report,
    factory,
    inspection: { ...report.inspection, submissions, batch },
  }
}
