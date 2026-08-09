import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { deriveProductionStatus } from '@/lib/production-status'
import { describeSpecDetails, collectSpecImages, type SpecDetail } from '@/lib/server/specUtils'

// The worker/inspector/QC flows predate the JobCard architecture and their
// UIs consume the old Batch/Order shape. This adapter maps a JobCard chain
// (WorkOrder -> ProductionPlan -> SalesOrder / BlueprintVersion) into that
// shape so the approved UI renders unchanged.

// The order's finished good and its answered spec columns. This is the generic
// source of the vehicle/fabric/design/colour/spec labels now that the studio
// stores them as spec values on the item instead of on the old SalesOrder
// relations. Options and linked items resolve straight from here, so the
// descriptor needs no extra query.
export const orderItemInclude = {
  group: { select: { name: true } },
  specValues: {
    include: {
      field: { select: { key: true, name: true, sortOrder: true, unitSuffix: true } },
      option: { select: { label: true, shortCode: true } },
      valueItem: {
        include: {
          specValues: {
            include: {
              field: { select: { key: true, name: true, sortOrder: true, unitSuffix: true } },
              option: { select: { label: true, shortCode: true } },
              valueItem: { select: { name: true, aliasName: true } },
            },
          },
        },
      },
    },
  },
} as const

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
              // Design (an ItemMaster) still supplies a reference image on the
              // floor; the seat-cover vehicle/fabric/colour relations are gone.
              design: { select: { id: true, name: true, imageUrl: true } },
              item: { include: orderItemInclude },
            },
          },
          blueprintVersion: {
            include: {
              blueprint: {
                include: {
                  item: {
                    // The item is what production is planned against, so its
                    // name is the one to show.
                    include: { group: { select: { name: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.JobCardInclude

export function jobCardBatchLabel(jobCard: { workOrder?: { woNumber?: string } | null; sequence: number }) {
  return `${jobCard.workOrder?.woNumber ?? 'WO'}-${jobCard.sequence}`
}

// Resolve an order's finished good into its full, ordered spec list — every
// answered column, product-agnostic, in the group's own SpecField order. No
// field key is special-cased: a seat cover, a box and a shirt each render their
// own fields under their own labels. A referenced item's specs (a linked Car's
// Brand/Model...) are flattened in by describeSpecDetails.
export function describeOrderItem(item: any): { specDetails: SpecDetail[] } {
  return { specDetails: describeSpecDetails(item) }
}

export function toWorkerJob(jobCard: any, assignedWorker?: { id: string; name: string } | null) {
  const plan = jobCard.workOrder?.productionPlan
  const salesOrder = plan?.salesOrder
  const item = plan?.blueprintVersion?.blueprint?.item
  // Vehicle fitment linked a variant to a vehicle row. Both tables are gone;
  // an order carries its own vehicle.
  const fitment: { vehicleModel?: any; fitmentNotes?: string } | undefined = undefined

  // The generic source: the ordered finished good's own spec values. Used to
  // fill the vehicle/fabric/design/colour/specs the legacy relations no longer
  // hold, with those relations kept as a fallback for pre-migration orders.
  const specs = describeOrderItem(salesOrder?.item)

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
      productVariant: null,
      remarks: salesOrder?.remarks ?? null,
      // Every picture the SKU carries — the product render, the chosen fabric's
      // swatch, the design artwork — not just the legacy design relation.
      designImages: [
        ...collectSpecImages(salesOrder?.item),
        ...(salesOrder?.design?.imageUrl ? [salesOrder.design.imageUrl] : []),
      ].filter((u, i, a) => a.indexOf(u) === i) as string[],
      // The item's name and category — the primary identity on floor/worker
      // cards, product-agnostic.
      productName: item?.group?.name ?? item?.name ?? salesOrder?.item?.group?.name ?? null,
      itemName: item?.name ?? salesOrder?.item?.name ?? null,
      variantName: item?.name ?? null,
      cadFileUrl: null,
      orderQuantity: (plan?.quantity ?? jobCard.targetQty) as number,
      // The full, ordered spec list — every answered field, no hardcoded keys.
      specDetails: specs.specDetails,
      // Back-compat alias; consumers should read specDetails.
      specFields: specs.specDetails,
    },
  }
}

// SalesOrder include chain + adapter to the old Order shape (orderNumber,
// vehicleBrand/Model, batches[].inspection) consumed by the dashboard,
// orders list, and floor progress components.
export const salesOrderInclude = {
  customer: true,
  item: { include: orderItemInclude },
  inspector: { select: { id: true, name: true } },
  // toLegacyOrder derives `dispatched` from this; without it the flag was always
  // false and a shipped order kept showing as still on the floor.
  dispatches: { select: { id: true, status: true } },
  plans: {
    include: {
      blueprintVersion: {
        include: {
          blueprint: {
            include: {
              item: { select: { name: true } },
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
} as const satisfies Prisma.SalesOrderInclude

export function toLegacyOrder(salesOrder: any) {
  const plan = salesOrder.plans?.[0]
  const item = plan?.blueprintVersion?.blueprint?.item
  const jobCards = (salesOrder.plans ?? []).flatMap((p: any) =>
    (p.workOrders ?? []).flatMap((wo: any) =>
      (wo.jobCards ?? []).map((jc: any) => ({ ...jc, workOrder: wo }))
    )
  )
  const firstAssigned = jobCards.find((jc: any) => jc.assignedTo)
  // Vehicle/fabric/design/colour from the ordered item's spec values, so the
  // dashboard and lists stop showing blanks where the legacy relations are null.
  const specs = describeOrderItem(salesOrder.item)

  return {
    ...salesOrder,
    orderNumber: salesOrder.soNumber,
    createdAt: salesOrder.orderDate,
    quantity: (salesOrder.plans ?? []).reduce((sum: number, p: any) => sum + (p.quantity ?? 0), 0) || 1,
    worker: firstAssigned?.assignedTo ?? null,
    workerId: firstAssigned?.assignedTo?.id ?? firstAssigned?.assignedToId ?? null,
    inspector: salesOrder.inspector ?? null,
    inspectorId: salesOrder.inspectorId ?? null,
    // The full, ordered spec list drives product-agnostic surfaces. The legacy
    // vehicle/design/material/color relations are still spread from salesOrder
    // above for the dashboard/production-list columns (Phase 3 cleanup).
    specDetails: specs.specDetails,
    specFields: specs.specDetails,
    images: collectSpecImages(salesOrder.item),
    itemName: item?.name ?? salesOrder.item?.name ?? null,
    productVariant: null,
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
