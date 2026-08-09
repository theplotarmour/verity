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

  // Photos taken during production, not just at QC. Cutting, Stitching and
  // Packing capture before/after shots and per-checkpoint evidence on their
  // StageEntry rows; the passport gallery showed none of it because it only
  // ever read the QC inspection's submissions.
  const workOrderId = report.inspection.jobCard?.workOrderId ?? null
  const stagePhotos: Array<{
    publicUrl: string
    checkpointName: string
    uploadedByName: string | null
    createdAt: Date
  }> = []

  if (workOrderId) {
    const stageEntries = await prisma.stageEntry.findMany({
      where: { jobCard: { workOrderId } },
      orderBy: { createdAt: 'asc' },
      include: { jobCard: { include: { department: { select: { name: true } }, stage: { select: { name: true } } } } },
    })

    const submitterIds = [...new Set(stageEntries.map((e) => e.submittedById).filter(Boolean))] as string[]
    const submitters = submitterIds.length
      ? await prisma.user.findMany({ where: { id: { in: submitterIds } }, select: { id: true, name: true } })
      : []
    const submitterName = new Map(submitters.map((u) => [u.id, u.name]))

    for (const entry of stageEntries) {
      const stageLabel =
        (entry.jobCard as any)?.department?.name ?? (entry.jobCard as any)?.stage?.name ?? 'Production'
      const who = entry.submittedById ? submitterName.get(entry.submittedById) ?? null : null
      const push = (url: unknown, label: string) => {
        if (typeof url === 'string' && url) {
          stagePhotos.push({ publicUrl: url, checkpointName: label, uploadedByName: who, createdAt: entry.createdAt })
        }
      }
      for (const u of (entry.beforeImages as unknown as any[]) ?? []) push(u, `${stageLabel} — before`)
      for (const u of (entry.afterImages as unknown as any[]) ?? []) push(u, `${stageLabel} — after`)
      // Per-checkpoint evidence lives inside the checklist JSON.
      for (const row of (entry.checklist as unknown as any[]) ?? []) {
        for (const u of row?.images ?? []) push(u, `${stageLabel} — ${row?.name ?? 'checkpoint'}`)
      }
    }
  }

  return {
    ...report,
    factory,
    stagePhotos,
    inspection: { ...report.inspection, submissions, batch },
  }
}
