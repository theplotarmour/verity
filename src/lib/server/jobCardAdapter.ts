import prisma from '@/lib/prisma'
import { deriveProductionStatus } from '@/lib/production-status'
import { designLabel } from '@/lib/variant-descriptor'

// The worker/inspector/QC flows predate the JobCard architecture and their
// UIs consume the old Batch/Order shape. This adapter maps a JobCard chain
// (WorkOrder -> ProductionPlan -> SalesOrder / BlueprintVersion) into that
// shape so the approved UI renders unchanged.

export const jobCardInclude = {
  department: true,
  stage: true,
  workOrder: {
    include: {
      productionPlan: {
        include: {
          salesOrder: {
            include: {
              customer: true,
              inspector: { select: { id: true, name: true } },
              design: { select: { id: true, name: true, category: true, imageUrls: true, fabricConsumption: true, cadFileUrl: true } },
              // Floor staff build the item, so they get the whole spec: fabric,
              // colour, product type and the order's own free-form fields.
              material: { select: { id: true, name: true, defaultUOM: true } },
              color: { select: { id: true, name: true } },
              productType: { select: { id: true, name: true, fields: { orderBy: { sortOrder: 'asc' as const } } } },
              vehicleBrand: true,
              vehicleModel: { include: { brand: true } },
            },
          },
          blueprintVersion: {
            include: {
              blueprint: {
                include: {
                  productVariant: {
                    include: {
                      product: { include: { category: true } },
                      fitments: {
                        include: { vehicleModel: { include: { brand: true } } },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const

export function jobCardBatchLabel(jobCard: { workOrder?: { woNumber?: string } | null; sequence: number }) {
  return `${jobCard.workOrder?.woNumber ?? 'WO'}-${jobCard.sequence}`
}

export function toWorkerJob(jobCard: any, assignedWorker?: { id: string; name: string } | null) {
  const plan = jobCard.workOrder?.productionPlan
  const salesOrder = plan?.salesOrder
  const variant = plan?.blueprintVersion?.blueprint?.productVariant
  const fitment = variant?.fitments?.[0]

  return {
    ...jobCard,
    batchNumber: jobCardBatchLabel(jobCard),
    quantity: jobCard.targetQty,
    createdAt: jobCard.startedAt ?? jobCard.workOrder?.startDate ?? new Date(),
    order: {
      id: salesOrder?.id,
      orderNumber: salesOrder?.soNumber,
      status: salesOrder?.status,
      customer: salesOrder?.customer ?? null,
      worker: assignedWorker ?? jobCard.assignedTo ?? null,
      workerId: jobCard.assignedToId ?? null,
      assignedWorkerId: jobCard.assignedToId ?? null,
      inspector: salesOrder?.inspector ?? null,
      inspectorId: salesOrder?.inspectorId ?? null,
      vehicleBrand: salesOrder?.vehicleBrand ?? fitment?.vehicleModel?.brand ?? null,
      vehicleModel: salesOrder?.vehicleModel ?? fitment?.vehicleModel ?? null,
      productVariant: variant ?? null,
      seatType: salesOrder?.seatType ?? null,
      hasArmrest: salesOrder?.hasArmrest ?? false,
      headrestCount: salesOrder?.headrestCount ?? null,
      remarks: salesOrder?.remarks ?? fitment?.fitmentNotes ?? null,
      designName: salesOrder?.design ? designLabel(salesOrder.design.name, salesOrder.design.category) : null,
      designImages: (salesOrder?.design?.imageUrls ?? []) as string[],
      // Full build spec for the floor. Customer identity is deliberately not
      // part of this — workers and supervisors get the what, not the who.
      vehicleYear: salesOrder?.vehicleYear ?? null,
      productName: variant?.product?.name ?? salesOrder?.productType?.name ?? null,
      variantName: variant?.name ?? null,
      designFamily: salesOrder?.design?.category ?? null,
      fabricName: salesOrder?.material?.name ?? null,
      colorName: salesOrder?.color?.name ?? null,
      fabricConsumption: salesOrder?.design?.fabricConsumption ?? null,
      cadFileUrl: salesOrder?.design?.cadFileUrl ?? null,
      orderQuantity: (plan?.quantity ?? jobCard.targetQty) as number,
      // Product-type spec fields the studio captured, resolved to label/value.
      specFields: resolveDynamicSpecs(salesOrder?.productType?.fields, salesOrder?.dynamicData),
    },
  }
}

// SalesOrder.dynamicData is keyed by ProductField.id. Pair it with the field
// definitions so the floor sees "Seat Type: Double Back" rather than raw ids.
function resolveDynamicSpecs(fields: any[] | undefined, dynamicData: any): Array<{ label: string; value: string }> {
  if (!fields?.length || !dynamicData || typeof dynamicData !== 'object') return []
  return fields
    .map((f) => ({ label: f.name as string, value: String((dynamicData as any)[f.id] ?? '').trim() }))
    .filter((s) => s.value.length > 0)
}

// SalesOrder include chain + adapter to the old Order shape (orderNumber,
// vehicleBrand/Model, batches[].inspection) consumed by the dashboard,
// orders list, and floor progress components.
export const salesOrderInclude = {
  customer: true,
  material: true,
  design: true,
  color: true,
  productType: true,
  vehicleBrand: true,
  vehicleModel: { include: { brand: true } },
  inspector: { select: { id: true, name: true } },
  plans: {
    include: {
      blueprintVersion: {
        include: {
          blueprint: {
            include: {
              productVariant: {
                include: {
                  product: { include: { category: true } },
                  fitments: {
                    include: { vehicleModel: { include: { brand: true } } },
                    take: 1,
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
            include: {
              stage: true,
              department: { select: { id: true, name: true } },
              assignedTo: { select: { id: true, name: true } },
              inspection: { include: { submissions: true, report: true } },
            },
            orderBy: { sequence: 'asc' as const },
          },
        },
      },
    },
  },
} as const

export function toLegacyOrder(salesOrder: any) {
  const plan = salesOrder.plans?.[0]
  const variant = plan?.blueprintVersion?.blueprint?.productVariant
  const fitment = variant?.fitments?.[0]
  const jobCards = (salesOrder.plans ?? []).flatMap((p: any) =>
    (p.workOrders ?? []).flatMap((wo: any) =>
      (wo.jobCards ?? []).map((jc: any) => ({ ...jc, workOrder: wo }))
    )
  )
  const firstAssigned = jobCards.find((jc: any) => jc.assignedTo)

  return {
    ...salesOrder,
    orderNumber: salesOrder.soNumber,
    createdAt: salesOrder.orderDate,
    quantity: (salesOrder.plans ?? []).reduce((sum: number, p: any) => sum + (p.quantity ?? 0), 0) || 1,
    worker: firstAssigned?.assignedTo ?? null,
    workerId: firstAssigned?.assignedTo?.id ?? firstAssigned?.assignedToId ?? null,
    inspector: salesOrder.inspector ?? null,
    inspectorId: salesOrder.inspectorId ?? null,
    // The order's own vehicle is authoritative; the shared-variant fitment is
    // only a fallback for legacy orders created before per-order columns existed.
    vehicleBrand: salesOrder.vehicleBrand ?? fitment?.vehicleModel?.brand ?? null,
    vehicleModel: salesOrder.vehicleModel ?? fitment?.vehicleModel ?? null,
    productVariant: variant ?? null,
    // Where the physical production bag actually is right now, on the same
    // ladder the floor uses (Draft ... Ready for Dispatch, Dispatched).
    productionStatus: deriveProductionStatus({
      orderStatus: salesOrder.status,
      dispatched: (salesOrder.dispatches?.length ?? 0) > 0,
      jobCards: jobCards.map((jc: any) => ({
        sequence: jc.sequence,
        status: jc.status,
        departmentName: jc.department?.name ?? null,
        stageName: jc.stage?.name ?? null,
      })),
    }),
    batches: jobCards.map((jc: any) => ({
      ...jc,
      batchNumber: jobCardBatchLabel(jc),
      quantity: jc.targetQty,
      departmentName: jc.department?.name ?? null,
    })),
  }
}

// Resolves JobCard.assignedToId (plain string, no relation in the schema)
// to users in one query for a page of job cards.
export async function loadAssignedWorkers(jobCards: Array<{ assignedToId?: string | null }>) {
  const ids = [...new Set(jobCards.map((jc) => jc.assignedToId).filter((id): id is string => !!id))]
  if (ids.length === 0) return new Map<string, { id: string; name: string }>()
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  })
  return new Map(users.map((u) => [u.id, u]))
}
