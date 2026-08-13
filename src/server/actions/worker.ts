'use server'

import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";

import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/server/auth'
import { uploadStorageImage } from '@/server/actions/storage'
import { jobCardInclude, toWorkerJob, jobCardBatchLabel } from '@/lib/server/jobCardAdapter'
import { canAccessJobCard } from '@/lib/server/jobCardAccess'

export async function getWorkerJobs() {
  const session = await getUserSession()
  if (!session) return [] as any
  await guardModuleAction("manufacturing");
  const isOwner = session.role === 'OWNER' || session.role === 'CO_OWNER' || session.role === 'MANAGER';
  const isSupervisor = session.role === 'SUPERVISOR';
  if (session.role !== 'WORKER' && !isSupervisor && !isOwner) return [] as any

  // Owner/management see everything. A department supervisor sees every card in
  // their department (assigned or not) — they oversee the whole stage. A worker
  // sees only the cards assigned to them personally.
  const me = isOwner
    ? null
    : await prisma.user.findUnique({ where: { id: session.userId }, select: { departmentId: true } })

  const workerFilter = isOwner
    ? { factoryId: session.factoryId }
    : isSupervisor
      ? { factoryId: session.factoryId, departmentId: me?.departmentId ?? '__none__' }
      : { factoryId: session.factoryId, assignedToId: session.userId }

  // Scheduled productions stay hidden from workers until their day arrives, then
  // become the task for that day. Owners/managers see everything (they schedule
  // it); only workers and supervisors are gated. Compared against end-of-today so
  // a job scheduled for today is visible all day.
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)
  const scheduleGate = isOwner
    ? {}
    : {
        workOrder: {
          status: { not: 'DRAFT' },
          productionPlan: {
            salesOrder: { OR: [{ scheduledFor: null }, { scheduledFor: { lte: endOfToday } }] },
          },
        },
      }

  const jobCards = await prisma.jobCard.findMany({
    where: {
      ...workerFilter,
      // QC_PENDING and AWAITING_APPROVAL stay on the list: a submission is not
      // final until the supervisor approves it, and until then the worker must
      // be able to reopen the card and amend their response.
      status: { in: ['WAITING', 'IN_PROGRESS', 'ON_HOLD', 'BLOCKED', 'REWORK_REQUIRED', 'AWAITING_APPROVAL', 'QC_PENDING'] },
      // Draft orders haven't been released to the floor yet; scheduled ones only
      // once their date arrives.
      ...(isOwner ? { workOrder: { status: { not: 'DRAFT' } } } : scheduleGate),
    },
    include: jobCardInclude,
    orderBy: { sequence: 'asc' },
  })

  return jobCards.map((jobCard) => toWorkerJob(jobCard))
}

export async function getInspectionData(jobCardId: string) {
  const session = await getUserSession()
  if (!session) return null
  await guardModuleAction("manufacturing");

  const jobCard = await prisma.jobCard.findFirst({
    where: {
      id: jobCardId,
      factoryId: session.factoryId,
    },
    include: {
      ...jobCardInclude,
      // Evidences come along so reopening a submitted inspection restores the
      // photos the worker already captured instead of showing them as missing.
      inspection: { include: { submissions: { include: { evidences: true } } } },
    },
  })

  if (!jobCard) return null;
  // A worker can only open their own inspection; a supervisor only their
  // department's; management, anything in the factory.
  if (!(await canAccessJobCard(session, jobCard))) return null;

  const factory = await prisma.factory.findUnique({
    where: { id: session.factoryId },
  })

  // Use the exact template pinned to this job card (whatever the owner chose for
  // the department); fall back to the blueprint version's QC template, then the
  // factory's latest active template.
  const pinnedTemplateId = (jobCard as any).templateId
    ?? (jobCard as any).workOrder?.productionPlan?.blueprintVersion?.qcTemplateId
  const templateInclude = {
    sections: {
      include: { checkpoints: { orderBy: { sortOrder: 'asc' as const } } },
      orderBy: { sortOrder: 'asc' as const },
    },
  }

  const template = pinnedTemplateId
    ? await prisma.checklistTemplate.findFirst({
        where: { id: pinnedTemplateId, factoryId: session.factoryId },
        include: templateInclude,
      })
    : await prisma.checklistTemplate.findFirst({
        where: { factoryId: session.factoryId, isLatest: true, status: 'active' },
        include: templateInclude,
      })

  const filteredTemplate = template
    ? {
        ...template,
        sections: template.sections.filter((section) => {
          const title = (section.title || "").toLowerCase();
          if (title.includes("final") || title.includes("approval")) return false;
          return !section.checkpoints.some((cp) => {
            const name = (cp.name || "").toLowerCase();
            return [
              "quantity",
              "photos captured",
              "qc pass",
              "qr generated",
              "qc sticker",
              "packer signed",
              "inspector signed",
              "date & time recorded",
            ].includes(name);
          });
        }),
      }
    : template;

  return { ...toWorkerJob(jobCard), inspection: jobCard.inspection, factory, template: filteredTemplate }
}

export async function submitCheckpoints(jobCardId: string, submissions: any[]) {
  const session = await getUserSession()
  const isOwner = session?.role === 'OWNER' || session?.role === 'CO_OWNER' || session?.role === 'MANAGER'
  if (!session || (session.role !== 'WORKER' && session.role !== 'SUPERVISOR' && !isOwner)) {
    return { error: 'Unauthorized' }
  }
  await guardModuleWrite("manufacturing");

  const jobCard = await prisma.jobCard.findFirst({
    where: { id: jobCardId, factoryId: session.factoryId },
    include: { workOrder: true },
  })

  if (!jobCard) {
    return { error: 'Job card not found' }
  }
  if (!(await canAccessJobCard(session, jobCard))) {
    return { error: "This job card isn't assigned to you." }
  }

  let inspection = await prisma.inspection.findUnique({
    where: { jobCardId: jobCard.id }
  })

  // A worker may keep amending until the supervisor signs off; once approved the
  // record is evidence and is frozen.
  if (inspection?.status === 'APPROVED') {
    return { error: 'This inspection has been approved and can no longer be changed.' }
  }

  // Inspections are created lazily on first submission: seed one submission
  // row per checkpoint of the applicable template.
  if (!inspection) {
    const checkpointIds = submissions.map((s) => s.checkpointId).filter(Boolean)
    inspection = await prisma.inspection.create({
      data: {
        factoryId: session.factoryId,
        jobCardId: jobCard.id,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        submissions: {
          create: checkpointIds.map((checkpointId: string) => ({
            factoryId: session.factoryId,
            checkpointId,
          })),
        },
      },
    })
  }

  const existingSubs = await prisma.checkpointSubmission.findMany({
    where: { inspectionId: inspection.id }
  })
  const subMap = new Map(existingSubs.map((s) => [s.checkpointId, s]))

  const preparedSubmissions: Array<{
    existingSubId: string;
    passFail: string;
    remark: string;
    completedAt: Date;
    uploadedPhoto: { path: string; publicUrl: string } | null;
    mimeType: string;
  }> = []

  for (const sub of submissions) {
    const existingSub = subMap.get(sub.checkpointId)
    if (!existingSub) continue

    const uploadedPhoto = sub.photo
      ? await uploadStorageImage({
          path: sub.storagePath,
          dataUrl: sub.photo,
          fileName: sub.fileName,
          mimeType: sub.contentType || 'image/jpeg',
          size: sub.size || 0,
        })
      : null

    preparedSubmissions.push({
      existingSubId: existingSub.id,
      passFail: sub.passFail,
      remark: sub.remark,
      completedAt: new Date(sub.timestamp),
      uploadedPhoto,
      mimeType: sub.contentType || 'image/jpeg',
    })
  }

  // Process all submissions in a transaction
  await prisma.$transaction(async (tx) => {
    for (const sub of preparedSubmissions) {
      await tx.checkpointSubmission.update({
        where: { id: sub.existingSubId },
        data: {
          passFail: sub.passFail,
          remarks: sub.remark,
          completedAt: sub.completedAt,
        }
      })

      if (sub.uploadedPhoto) {
        await tx.imageEvidence.create({
          data: {
            factoryId: session.factoryId,
            submissionId: sub.existingSubId,
            storageKey: sub.uploadedPhoto.path,
            publicUrl: sub.uploadedPhoto.publicUrl,
            mimeType: sub.mimeType,
            uploadedById: session.userId,
          }
        })
      }
    }

    await tx.inspection.update({
      where: { id: inspection!.id, factoryId: session.factoryId },
      data: {
        status: 'WAITING_QC',
        submittedAt: new Date()
      }
    })

    await tx.jobCard.update({
      where: { id: jobCard.id },
      data: {
        status: 'QC_PENDING'
      }
    })

    const userRecord = await tx.user.findUnique({
      where: { id: session.userId }
    });
    const userName = userRecord?.name || "Worker";

    const batchLabel = jobCardBatchLabel(jobCard)

    await tx.auditLog.create({
      data: {
        factoryId: session.factoryId,
        actorUserId: session.userId,
        action: `Worker ${userName} uploaded QC evidence`,
        entityType: 'Inspection',
        entityId: inspection!.id,
        metadata: { message: `Worker ${userName} submitted inspection for Job Card ${batchLabel}` }
      }
    })

    // Notify only the supervisors who own this department's queue. Management
    // can still see the queue, but non-QC supervisors should not receive QC
    // work from other departments.
    const inspectors = await tx.user.findMany({
      where: { factoryId: session.factoryId, departmentId: jobCard.departmentId, role: 'SUPERVISOR', isActive: true },
      select: { id: true },
    })

    for (const inspector of inspectors) {
      await tx.notification.create({
        data: {
          factoryId: session.factoryId,
          userId: inspector.id,
          title: 'Inspection Ready for QC',
          message: `Job Card ${batchLabel} is waiting for your review.`,
          type: 'ACTION_REQUIRED',
          linkUrl: `/inspector/review/${inspection!.id}`,
        }
      })
    }
  }, { timeout: 30000, maxWait: 10000 })

  // After the commit, and outside it. The audit is saved; a failed fan-out must
  // not roll back a worker's submission, and the notification is worthless if the
  // transaction it was written inside later aborts.
  //
  // The routine nudge above tells the owning department its queue has an item.
  // This is the separate case: the audit came back below the pass mark, which is
  // the owner's and every supervisor's problem, and until now was visible only to
  // whoever opened the inspection.
  try {
    const { reportQcAuditScore } = await import('./qc')
    await reportQcAuditScore(inspection!.id)
  } catch (e) {
    console.error('QC audit score alert failed', e)
  }

  return { success: true }
}
