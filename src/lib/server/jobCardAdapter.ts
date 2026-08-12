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
      // The sibling cards, so any surface holding one card also knows the route
      // it belongs to. A work order carries a handful of cards, and the
      // alternative is a query per card to draw a stage strip.
      jobCards: {
        select: {
          sequence: true,
          status: true,
          stage: { select: { name: true } },
          department: { select: { name: true } },
        },
        orderBy: { sequence: 'asc' as const },
      },
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

// ==========================================
// Production stage sequence
// ==========================================

// The ordered stages a product actually passes through. There is no universal
// list: the sequence is whatever the item's blueprint route says, which is why
// the floor sees Cutting → Stitching → QC → Packing for a seat cover and
// something else entirely for a food prep line or a facility route. Anything
// hardcoding four stages is wrong for three of the four verticals.
//
// Two sources, in order of authority:
//   1. The order's own job cards. Once a plan is released these *are* the route,
//      copied from it, and they carry live status — so they are what a card
//      showing progress must render.
//   2. The item's active blueprint route steps. The spec sheet's answer for an
//      order that has not been released yet, and the only answer available when
//      all you have is an item.

type StageCardLike = {
  sequence: number
  status?: string | null
  stage?: { name?: string | null } | null
  department?: { name?: string | null } | null
  departmentName?: string | null
  stageName?: string | null
}

// A card's stage name. The WorkflowStage wins when set, because a department can
// run more than one stage; the department is the fallback for the legacy cards
// `releasePlanToWorkOrder` creates straight off the route with no stageId.
function stageCardName(card: StageCardLike): string | null {
  return (
    card.stage?.name ??
    card.stageName ??
    card.department?.name ??
    card.departmentName ??
    null
  )
}

export type StageSequence = {
  /** Ordered stage names. Empty when nothing has been routed yet. */
  stages: string[]
  /**
   * Where the work physically is: the first card that is not COMPLETED, matching
   * `deriveProductionStatus`. Null when every stage is done, or there are none.
   */
  currentStage: string | null
}

/**
 * Derive the sequence from job cards already loaded on the page.
 *
 * Pure, so the dashboards that hold the whole card chain pay no extra query, and
 * a client component can be handed `string[]` instead of a database handle.
 */
export function stageSequenceFromJobCards(cards: StageCardLike[] | null | undefined): StageSequence {
  const ordered = [...(cards ?? [])].sort((a, b) => a.sequence - b.sequence)
  const named = ordered
    .map((card) => ({ name: stageCardName(card), status: card.status ?? null }))
    .filter((entry): entry is { name: string; status: string | null } => Boolean(entry.name))

  const current = named.find((entry) => entry.status !== 'COMPLETED')
  return {
    stages: named.map((entry) => entry.name),
    currentStage: current?.name ?? null,
  }
}

/** The route steps of an item's active blueprint version, in sequence. */
async function blueprintStages(factoryId: string, itemId: string): Promise<string[]> {
  const blueprint = await prisma.blueprint.findFirst({
    where: { factoryId, itemId },
    select: {
      activeVersionId: true,
      versions: {
        select: {
          id: true,
          isActive: true,
          versionNumber: true,
          routeSteps: {
            select: { sequence: true, department: { select: { name: true } } },
            orderBy: { sequence: 'asc' },
          },
        },
        orderBy: { versionNumber: 'desc' },
      },
    },
  })
  if (!blueprint) return []

  // activeVersionId is the pointer the builder maintains; isActive is the flag on
  // the row. They can disagree, so prefer the pointer and fall back to the newest
  // version rather than returning nothing.
  const version =
    blueprint.versions.find((v) => v.id === blueprint.activeVersionId) ??
    blueprint.versions.find((v) => v.isActive) ??
    blueprint.versions[0]

  return (version?.routeSteps ?? [])
    .map((step) => step.department?.name)
    .filter((name): name is string => Boolean(name))
}

/**
 * The ordered production stage names for an order or an item.
 *
 * Always tenant-scoped: `factoryId` filters the sales order and the blueprint, so
 * another tenant's route can never be read by guessing an id.
 *
 * Returns an empty array — never throws — when the id is unknown, the item has no
 * blueprint, or the blueprint has no route steps. A missing route is an ordinary
 * state (a brand-new item), and a stage strip is the wrong place to raise it.
 */
export async function resolveProductionStages(args: {
  factoryId: string
  orderId?: string | null
  itemId?: string | null
}): Promise<string[]> {
  const { factoryId, orderId, itemId } = args
  if (!factoryId) return []

  if (orderId) {
    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, factoryId },
      select: {
        itemId: true,
        plans: {
          select: {
            blueprintVersion: {
              select: {
                routeSteps: {
                  select: { sequence: true, department: { select: { name: true } } },
                  orderBy: { sequence: 'asc' },
                },
              },
            },
            workOrders: {
              select: {
                jobCards: {
                  select: {
                    sequence: true,
                    status: true,
                    stage: { select: { name: true } },
                    department: { select: { name: true } },
                  },
                  orderBy: { sequence: 'asc' },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!order) return []

    const cards = order.plans.flatMap((plan) => plan.workOrders.flatMap((wo) => wo.jobCards))
    if (cards.length > 0) return stageSequenceFromJobCards(cards).stages

    // Planned but not released: the route it will be released against.
    const planned = order.plans
      .flatMap((plan) => plan.blueprintVersion?.routeSteps ?? [])
      .map((step) => step.department?.name)
      .filter((name): name is string => Boolean(name))
    if (planned.length > 0) return planned

    // Still a draft — fall through to the item's own blueprint.
    return order.itemId ? blueprintStages(factoryId, order.itemId) : []
  }

  return itemId ? blueprintStages(factoryId, itemId) : []
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
    // The route this card sits on, for the stage strip. Free: the sibling cards
    // come down with `jobCardInclude`.
    stageSequence: stageSequenceFromJobCards(jobCard.workOrder?.jobCards),
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
    // The order's own route, derived from the cards already flattened above.
    stageSequence: stageSequenceFromJobCards(
      jobCards.map((jc: any) => ({
        sequence: jc.sequence,
        status: jc.status,
        stage: jc.stage,
        department: jc.department,
      }))
    ),
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
