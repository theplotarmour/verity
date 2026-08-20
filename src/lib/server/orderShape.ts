import type { Prisma } from "@prisma/client";

/**
 * The order shape the approved V1 order UI consumes.
 *
 * This replaces `jobCardAdapter`, which mapped a `SalesOrder -> ProductionPlan
 * -> WorkOrder -> JobCard` chain down into the flat shape the order lists and
 * the search page render. The chain went with the manufacturing module, so the
 * mapping has almost nothing left to do — but the field names it produced
 * (`orderNumber`, `quantity`, `productionStatus`, `batches`) are read across
 * several clients, and renaming them is a separate change from removing MES.
 *
 * So the names stay and the derivation gets honest: quantity comes from the
 * order lines rather than the production plan, and status is the order's own
 * status rather than a ladder read off the furthest-advanced job card. Fields
 * that only a job card could answer are null or empty, never invented.
 */

export const salesOrderInclude = {
  customer: true,
  inspector: { select: { id: true, name: true } },
  design: { select: { id: true, name: true, imageUrl: true } },
  item: { select: { id: true, name: true, imageUrl: true } },
  items: true,
  dispatches: { select: { id: true } },
} satisfies Prisma.SalesOrderInclude;

export function toLegacyOrder(salesOrder: any) {
  const quantity =
    (salesOrder.items ?? []).reduce((sum: number, line: any) => sum + (line.quantity ?? 0), 0) || 1;
  const dispatched = (salesOrder.dispatches?.length ?? 0) > 0;

  return {
    ...salesOrder,
    orderNumber: salesOrder.soNumber,
    createdAt: salesOrder.orderDate,
    quantity,
    /*
     * The worker was whoever held the first assigned job card. Nothing assigns
     * an order to a person any more, so this is null rather than a guess at the
     * order's creator, who is a different fact.
     */
    worker: null,
    workerId: null,
    inspector: salesOrder.inspector ?? null,
    inspectorId: salesOrder.inspectorId ?? null,
    /*
     * Spec columns were answers stored on the ordered item by the spec engine.
     * Empty, so the product-agnostic surfaces render no spec rows instead of
     * rows of blanks.
     */
    specDetails: [],
    specFields: [],
    /** The route an order walked. There are no stages left to walk. */
    stageSequence: [],
    images: salesOrder.item?.imageUrl ? [salesOrder.item.imageUrl] : [],
    itemName: salesOrder.item?.name ?? null,
    productVariant: null,
    productionStatus: dispatched ? "Dispatched" : salesOrder.status,
    batches: [],
  };
}
