'use server'

import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";

import prisma from '@/lib/prisma'
import { getUserSession } from '@/lib/server/auth'
import { QCStatus } from '@prisma/client'
import { redirect } from 'next/navigation'
import { jobCardInclude, toWorkerJob, jobCardBatchLabel, loadAssignedWorkers, describeOrderItem, orderItemInclude } from '@/lib/server/jobCardAdapter'
import { receiveFinishedGoods } from '@/server/internal/stockMovements'
import { recordTimeline } from '@/lib/server/stages'
import { departmentKind } from '@/lib/production-status'
import { canAccessJobCard, getSessionDepartmentId } from '@/lib/server/jobCardAccess'
import { collectSpecImages } from '@/lib/server/specUtils'

// QC is performed by the supervisor of the QC department (no separate inspector
// role) and by management. Kept as one predicate the whole QC flow gates on.
function isInspectorOrOwner(role: string) {
  return role === 'SUPERVISOR' || role === 'OWNER' || role === 'CO_OWNER' || role === 'MANAGER'
}

// Whether the acting user may review the inspection's job card — a supervisor
// only within their own department, management anywhere in the factory.
async function canAccessInspection(session: NonNullable<Awaited<ReturnType<typeof getUserSession>>>, inspectionId: string) {
  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId, factoryId: session.factoryId },
    select: { jobCard: { select: { factoryId: true, departmentId: true, assignedToId: true } } },
  })
  if (!inspection?.jobCard) return false
  return canAccessJobCard(session, inspection.jobCard)
}

function getRedirectPath(role: string) {
  return (role === 'OWNER' || role === 'CO_OWNER' || role === 'MANAGER') ? '/owner/qc-floor' : '/inspector'
}

export async function getInspectorInbox(filter: 'pending' | 'reviewed' = 'pending') {
  const session = await getUserSession()
  if (!session || !isInspectorOrOwner(session.role)) return [] as any
  await guardModuleAction("quality");

  // A supervisor reviews only their own department's QC queue; management sees
  // every department's.
  const deptScope = session.role === 'SUPERVISOR'
    ? { jobCard: { departmentId: (await getSessionDepartmentId(session)) ?? '__none__' } }
    : {}

  const inspections = await prisma.inspection.findMany({
    where: {
      factoryId: session.factoryId,
      status: filter === 'reviewed' ? { in: ['APPROVED', 'REJECTED', 'REWORK_REQUIRED'] } : 'WAITING_QC',
      ...deptScope,
    },
    include: {
      jobCard: { include: jobCardInclude },
    },
    orderBy: filter === 'reviewed' ? { updatedAt: 'desc' } : { createdAt: 'asc' }
  })

  const workers = await loadAssignedWorkers(inspections.map((i) => i.jobCard))
  return inspections.map((inspection) => ({
    ...inspection,
    batch: toWorkerJob(inspection.jobCard, workers.get(inspection.jobCard.assignedToId ?? '') ?? null),
  }))
}

// Full order dossier for the review page: everything about an order plus the
// per-department checklist trail (each department, the template it ran, and the
// checklist results captured). Keyed by inspectionId (the link the floor/cards
// use); resolves up to the sales order and loads the whole production chain.
export async function getOrderReview(inspectionId: string) {
  const session = await getUserSession()
  if (!session || !isInspectorOrOwner(session.role)) return null
  await guardModuleAction("quality");

  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId, factoryId: session.factoryId },
    select: { jobCard: { select: { factoryId: true, departmentId: true, assignedToId: true, workOrder: { select: { productionPlan: { select: { salesOrderId: true } } } } } } },
  })
  const salesOrderId = inspection?.jobCard?.workOrder?.productionPlan?.salesOrderId
  if (!salesOrderId) return null
  // A supervisor only reviews their own department's dossier.
  if (inspection?.jobCard && !(await canAccessJobCard(session, inspection.jobCard))) return null

  const order = await prisma.salesOrder.findUnique({
    where: { id: salesOrderId, factoryId: session.factoryId },
    include: {
      customer: true,
      design: true,
      // The ordered item + its spec values (recursively flattening a referenced
      // item's specs) drive the product-agnostic dossier.
      item: { include: orderItemInclude },
      inspector: { select: { id: true, name: true } },
      dispatches: true,
      plans: {
        include: {
          blueprintVersion: {
            include: {
              qcTemplate: { select: { id: true, name: true } },
              bom: { include: { items: { include: { item: true } } } },
              blueprint: {
                include: {
                  item: {
                    include: {
                      group: { select: { name: true } },
                      specValues: {
                        include: {
                          field: { select: { name: true, sortOrder: true, unitSuffix: true } },
                          option: { select: { label: true } },
                          valueItem: { select: { name: true, aliasName: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          workOrders: {
            include: {
              jobCards: {
                orderBy: { sequence: 'asc' },
                include: {
                  // Members come along so the review page can reassign a stage
                  // to anyone staffing that department.
                  department: {
                    include: {
                      members: {
                        where: { isActive: true },
                        select: { id: true, name: true, role: true },
                        orderBy: { name: 'asc' },
                      },
                    },
                  },
                  stage: true,
                  assignedTo: { select: { id: true, name: true, role: true } },
                  template: { select: { id: true, name: true } },
                  stageEntries: { orderBy: { createdAt: 'desc' } },
                  inspection: {
                    include: {
                      submissions: { include: { checkpoint: { include: { section: true } }, evidences: true } },
                      report: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  if (!order) return null

  // Resolve assigned worker names (assignedToId is a plain string when the
  // relation wasn't hydrated) — already included above via assignedTo.
  const plan = order.plans?.[0]
  const bv = plan?.blueprintVersion
  const oitem = bv?.blueprint?.item
  // Vehicle fitment linked variants to vehicle rows; both tables are gone.
  const jobCards = (order.plans ?? []).flatMap((p: any) =>
    (p.workOrders ?? []).flatMap((wo: any) => (wo.jobCards ?? []).map((jc: any) => ({ ...jc, woNumber: wo.woNumber })))
  ).sort((a: any, b: any) => a.sequence - b.sequence)

  const specs = describeOrderItem(order.item)

  return {
    activeInspectionId: inspectionId,
    order,
    spec: {
      product: oitem?.group?.name ?? oitem?.name ?? order.item?.group?.name ?? null,
      category: oitem?.group?.name ?? order.item?.group?.name ?? null,
      variantName: oitem?.name ?? order.item?.name ?? null,
      itemName: oitem?.name ?? order.item?.name ?? null,
      // Every answered spec, product-agnostic (recursively includes a linked
      // item's specs), in the group's column order.
      specDetails: specs.specDetails,
      // The product render plus any picture its referenced specs carry (fabric
      // swatch, design artwork), so the review shows the whole SKU, not one image.
      images: collectSpecImages(order.item ?? oitem),
    },
    materials: (bv?.bom?.items ?? []).map((it: any) => ({
      name: it.item?.name ?? '—',
      sku: it.item?.sku ?? null,
      uom: it.item?.defaultUOM ?? '',
      perUnit: it.quantity,
      wastePercent: it.wastePercent,
      totalForOrder: it.quantity * (plan?.quantity ?? 1),
    })),
    template: bv?.qcTemplate ?? null,
    jobCards,
  }
}

export async function getReviewData(inspectionId: string) {
  const session = await getUserSession()
  if (!session || !isInspectorOrOwner(session.role)) return null
  await guardModuleAction("quality");

  const inspection = await prisma.inspection.findUnique({
    where: { id: inspectionId, factoryId: session.factoryId },
    include: {
      jobCard: { include: jobCardInclude },
      submissions: {
        include: { checkpoint: { include: { section: true } }, evidences: true }
      },
      report: true
    }
  })

  if (!inspection) return null;
  // A supervisor only reviews their own department's inspection.
  if (!(await canAccessJobCard(session, inspection.jobCard))) return null;

  // Use the template pinned to this job card (the one the owner chose for the
  // department); fall back to the blueprint version's QC template, then the
  // factory's latest active template. This keeps the review in lockstep with
  // exactly what the worker filled in.
  const pinnedTemplateId = (inspection.jobCard as any).templateId
    ?? (inspection.jobCard as any).workOrder?.productionPlan?.blueprintVersion?.qcTemplateId
  const templateInclude = {
    sections: {
      include: { checkpoints: { orderBy: { sortOrder: 'asc' as const } } },
      orderBy: { sortOrder: 'asc' as const }
    }
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

  const workers = await loadAssignedWorkers([inspection.jobCard])

  // Earlier production stages of the same work order — the inspector can send
  // a rejected job back to any of them for rework.
  const reworkTargets = await prisma.jobCard.findMany({
    where: {
      workOrderId: inspection.jobCard.workOrderId,
      sequence: { lt: inspection.jobCard.sequence },
    },
    include: { stage: true, department: true },
    orderBy: { sequence: 'desc' },
  }).then((cards) => cards
    // Exclude any QC stage — a rejected job goes back to a production stage, not
    // to another QC. QC-ness lives on the department (new) or stage (legacy).
    .filter((c) => !(c.stage?.isQcStage || c.department?.isQcStage))
    .map((c) => ({
      id: c.id,
      stageName: c.stage?.name ?? c.department?.name ?? `Step ${c.sequence}`,
      sequence: c.sequence,
    })))

  return {
    ...inspection,
    batch: toWorkerJob(inspection.jobCard, workers.get(inspection.jobCard.assignedToId ?? '') ?? null),
    template,
    reworkTargets,
  };
}

// Workers eligible to be handed a packing job once QC passes.
export async function getPackingOperators() {
  const session = await getUserSession()
  if (!session) return []
  await guardModuleAction("quality");
  return prisma.user.findMany({
    where: { factoryId: session.factoryId, isActive: true, role: { in: ['WORKER', 'SUPERVISOR'] } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

// `packerId` hands the freed packing job straight to an operator. Packing can
// never start earlier than this: every stage after the first is created BLOCKED
// and only QC approval unblocks the one that follows it.
export async function approveInspection(inspectionId: string, comments: string, packerId?: string) {
  const session = await getUserSession()
  if (!session || !isInspectorOrOwner(session.role)) throw new Error('Unauthorized')
  await guardModuleWrite("quality");
  if (!(await canAccessInspection(session, inspectionId))) throw new Error('This inspection is in another department.')

  let packerNotify: { userId: string; title: string; message: string; linkUrl: string } | null = null
  let workOrderCompleted = false
  let completedWorkOrder: { id: string; productionPlanId: string; targetQty: number } | null = null
  await prisma.$transaction(async (tx) => {
    const inspection = await tx.inspection.update({
      where: { id: inspectionId, factoryId: session.factoryId },
      data: {
        status: QCStatus.APPROVED,
        approvedAt: new Date()
      },
      include: { jobCard: { include: { workOrder: true } } }
    })
    completedWorkOrder = { id: inspection.jobCard.workOrderId, productionPlanId: inspection.jobCard.workOrder.productionPlanId, targetQty: inspection.jobCard.targetQty }

    const jobCard = inspection.jobCard
    const batchLabel = jobCardBatchLabel(jobCard)

    // Approval completes the job card and advances the work order chain.
    await tx.jobCard.update({
      where: { id: jobCard.id },
      data: { status: 'COMPLETED', completedQty: jobCard.targetQty, completedAt: new Date() }
    })

    const nextJobCard = await tx.jobCard.findFirst({
      where: { workOrderId: jobCard.workOrderId, sequence: jobCard.sequence + 1 },
      include: { stage: true, department: true },
    })

    if (nextJobCard) {
      const isPacking = departmentKind(nextJobCard.stage?.name ?? nextJobCard.department?.name) === 'PACKING'
      await tx.jobCard.update({
        where: { id: nextJobCard.id },
        data: {
          status: 'WAITING',
          // Only override the assignee when a packer was explicitly chosen.
          ...(isPacking && packerId ? { assignedToId: packerId } : {}),
        },
      })
      if (isPacking && packerId) {
        packerNotify = {
          userId: packerId,
          title: 'Packing Assigned',
          message: `${batchLabel} passed QC and is ready for packing.`,
          linkUrl: `/worker/stage/${nextJobCard.id}`,
        }
      }
    } else {
      await tx.workOrder.update({
        where: { id: jobCard.workOrderId },
        data: { status: 'COMPLETED', producedQty: jobCard.targetQty }
      })
      await tx.productionPlan.update({
        where: { id: jobCard.workOrder.productionPlanId },
        data: { status: 'COMPLETED' }
      })
      workOrderCompleted = true
    }

    // Avoid unique constraint failure on double approval/resubmission
    const existingApproval = await tx.qualityApproval.findFirst({
      where: { inspectionId }
    })
    if (!existingApproval) {
      await tx.qualityApproval.create({
        data: {
          factoryId: session.factoryId,
          inspectionId,
          inspectorId: session.userId,
          status: 'APPROVED',
          comments
        }
      })
    }

    const existingReport = await tx.qualityReport.findFirst({
      where: { inspectionId }
    })
    if (!existingReport) {
      const reportCode = 'V-' + Math.random().toString(36).substring(2, 10).toUpperCase()
      await tx.qualityReport.create({
        data: {
          factoryId: session.factoryId,
          inspectionId,
          verificationCode: reportCode,
        }
      })
    }

    const userRecord = await tx.user.findUnique({
      where: { id: session.userId }
    });
    const userName = userRecord?.name || "Inspector";

    await tx.auditLog.create({
      data: {
        factoryId: session.factoryId,
        actorUserId: session.userId,
        action: `Inspector ${userName} approved QC for ${batchLabel}`,
        entityType: 'Inspection',
        entityId: inspectionId,
        metadata: { message: `Inspector ${userName} approved QC for ${batchLabel}` }
      }
    })

    await recordTimeline(tx, {
      factoryId: session.factoryId,
      workOrderId: jobCard.workOrderId,
      eventType: 'APPROVED',
      title: 'QC approved',
      description: comments || undefined,
      actorId: session.userId,
      metadata: { inspectionId },
    })

    if (jobCard.assignedToId) {
      await tx.notification.create({
        data: {
          factoryId: session.factoryId,
          userId: jobCard.assignedToId,
          title: 'Inspection Approved',
          message: `Your inspection for ${batchLabel} was approved.`,
          type: 'SUCCESS',
          linkUrl: `/worker`
        }
      })
    }
  }, { timeout: 30000, maxWait: 10000 })

  // Delivered after commit so the operator can't be told about a packing job
  // that a rolled-back transaction never actually assigned.
  if (packerNotify) {
    const notify = packerNotify as { userId: string; title: string; message: string; linkUrl: string }
    await prisma.notification.create({
      data: {
        factoryId: session.factoryId,
        userId: notify.userId,
        title: notify.title,
        message: notify.message,
        type: 'ACTION_REQUIRED',
        linkUrl: notify.linkUrl,
      },
    })
  }

  if (workOrderCompleted && completedWorkOrder) {
    try {
      const plan = await prisma.productionPlan.findUnique({
        where: { id: (completedWorkOrder as any).productionPlanId },
        include: {
          blueprintVersion: { include: { blueprint: true } },
          salesOrder: { include: { customer: { select: { name: true } } } },
        },
      })
      // Stock production is not auto-warehoused — it goes to the Dispatch page and
      // the owner moves it manually. Customer orders still auto-receive.
      const isStockProduction = plan?.salesOrder?.customer?.name === "Stock Production"
      if (plan && !isStockProduction) {
        await receiveFinishedGoods({
          factoryId: session.factoryId,
          workOrderId: (completedWorkOrder as any).id,
          itemId: plan.blueprintVersion.blueprint.itemId,
          quantity: (completedWorkOrder as any).targetQty,
        })
      }
    } catch (error) {
      console.error('Finished goods receipt failed:', error)
    }
  }

  redirect(getRedirectPath(session.role))
}

// Rejects an inspection. With `returnToJobCardId`, the job returns to that
// earlier production stage for rework (PRD: "QC rejection must return the job
// to the relevant department"); every stage between it and QC is re-blocked
// and must be redone. Without a target, the QC card itself flips to rework
// (legacy single-card behaviour).
export async function rejectInspection(inspectionId: string, reason: string, returnToJobCardId?: string) {
  const session = await getUserSession()
  if (!session || !isInspectorOrOwner(session.role)) throw new Error('Unauthorized')
  await guardModuleWrite("quality");
  if (!(await canAccessInspection(session, inspectionId))) throw new Error('This inspection is in another department.')

  // Captured inside the tx, delivered through emitEvent after it commits.
  let workerNotify: { userId: string; title: string; message: string; linkUrl: string } | null = null
  let rejectBatchLabel = ''
  let rejectWorkOrderId = ''

  await prisma.$transaction(async (tx) => {
    const inspection = await tx.inspection.update({
      where: { id: inspectionId, factoryId: session.factoryId },
      data: { status: QCStatus.REWORK_REQUIRED },
      include: { jobCard: { include: { workOrder: true, stage: true } } }
    })

    const jobCard = inspection.jobCard
    const batchLabel = jobCardBatchLabel(jobCard)
    rejectBatchLabel = batchLabel
    rejectWorkOrderId = jobCard.workOrderId

    const target = returnToJobCardId
      ? await tx.jobCard.findFirst({
          where: {
            id: returnToJobCardId,
            workOrderId: jobCard.workOrderId,
            sequence: { lt: jobCard.sequence },
          },
          include: { stage: true, department: true },
        })
      : null

    let reworkStageName: string | null = null
    if (target) {
      reworkStageName = target.stage?.name ?? target.department?.name ?? `Step ${target.sequence}`
      await tx.jobCard.update({
        where: { id: target.id },
        data: { status: 'REWORK_REQUIRED', reworkReason: reason },
      })
      // Everything after the faulty stage (including the QC card) is redone.
      await tx.jobCard.updateMany({
        where: {
          workOrderId: jobCard.workOrderId,
          sequence: { gt: target.sequence, lte: jobCard.sequence },
        },
        data: { status: 'BLOCKED' },
      })
      if (target.assignedToId) {
        workerNotify = {
          userId: target.assignedToId,
          title: 'Rework Required',
          message: `${batchLabel}: QC returned the job to ${reworkStageName}. Reason: ${reason}`,
          linkUrl: `/worker/stage/${target.id}`,
        }
      }
    } else {
      await tx.jobCard.update({
        where: { id: jobCard.id },
        data: { status: 'REWORK_REQUIRED', reworkReason: reason }
      })
      if (jobCard.assignedToId) {
        workerNotify = {
          userId: jobCard.assignedToId,
          title: 'Rework Required',
          message: `Your inspection for ${batchLabel} was rejected: ${reason}`,
          linkUrl: `/worker`,
        }
      }
    }

    const userRecord = await tx.user.findUnique({
      where: { id: session.userId }
    });
    const userName = userRecord?.name || "Inspector";

    await recordTimeline(tx, {
      factoryId: session.factoryId,
      workOrderId: jobCard.workOrderId,
      eventType: 'REJECTED',
      title: reworkStageName
        ? `QC rejected — returned to ${reworkStageName}`
        : 'QC rejected — rework required',
      description: reason,
      actorId: session.userId,
      metadata: { inspectionId, returnToJobCardId: target?.id ?? null },
    })

    await tx.auditLog.create({
      data: {
        factoryId: session.factoryId,
        actorUserId: session.userId,
        action: `Inspector ${userName} rejected checkpoint`,
        entityType: 'Inspection',
        entityId: inspectionId,
        metadata: { message: `Inspection rejected by ${userName}: ${reason}`, returnedTo: reworkStageName }
      }
    })
  }, { timeout: 30000, maxWait: 10000 })

  // Deliver the rework alert (in-app + email/WhatsApp) to the worker, and a
  // summary to owners — QC rejection is a high-value event.
  try {
    const { emitEvent, EVENTS, ownerRecipients } = await import('@/lib/server/events')
    if (workerNotify) {
      const w = workerNotify as { userId: string; title: string; message: string; linkUrl: string }
      await emitEvent({
        factoryId: session.factoryId,
        event: EVENTS.QC_REJECTED as any,
        recipients: [w.userId],
        title: w.title,
        message: w.message,
        linkUrl: w.linkUrl,
        type: 'WARNING',
      })
    }
    const owners = (await ownerRecipients(session.factoryId)).filter((id) => id !== session.userId)
    if (owners.length) {
      await emitEvent({
        factoryId: session.factoryId,
        event: EVENTS.QC_REJECTED as any,
        recipients: owners,
        title: 'QC rejected',
        message: `${rejectBatchLabel} failed QC: ${reason}`,
        linkUrl: `/owner/review`,
        type: 'WARNING',
      })
    }
  } catch (e) {
    console.error('QC-rejected event emit failed', e)
  }

  redirect(getRedirectPath(session.role))
}


export async function verifyCheckpoint(submissionId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING', comment: string) {
  const session = await getUserSession()
  if (!session || !isInspectorOrOwner(session.role)) throw new Error('Unauthorized')
  await guardModuleWrite("quality");

  const isReset = status === 'PENDING';

  // A supervisor may only verify checkpoints on their own department's QC.
  if (session.role === 'SUPERVISOR') {
    const sub = await prisma.checkpointSubmission.findFirst({
      where: { id: submissionId, factoryId: session.factoryId },
      select: { inspection: { select: { jobCard: { select: { factoryId: true, departmentId: true, assignedToId: true } } } } },
    })
    if (!sub?.inspection?.jobCard || !(await canAccessJobCard(session, sub.inspection.jobCard))) {
      throw new Error('This inspection is in another department.')
    }
  }

  // Prevent IDOR by ensuring the submission belongs to a valid inspection in this factory
  const count = await prisma.checkpointSubmission.updateMany({
    where: {
      id: submissionId,
      factoryId: session.factoryId
    },
    data: {
      verificationStatus: isReset ? null : status,
      inspectorComment: isReset ? null : comment,
      verifiedAt: isReset ? null : new Date()
    }
  })

  if (count.count === 0) {
    throw new Error('Unauthorized or submission not found')
  }
}
