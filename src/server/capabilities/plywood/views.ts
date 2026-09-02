import { z } from "zod";
import { reachableGodownIds } from "./scope";
import { resolveTaxRate } from "./tax";
import { type QueryDefinition } from "@/server/platform/query";
import {
  ENTITY_PRODUCT,
  ENTITY_STOCK_BALANCE,
  ENTITY_STOCK_LEDGER,
} from "./keys";
import type { TenantScopedClient } from "@/server/platform/tenancy";

/**
 * PLYWOOD — inventory drill-down projections.
 *
 * Specification: target user flow §10 (product detail), §11 (godown detail),
 * §12 (stock), §13 (the movement ledger that explains a quantity).
 * Program: taskplans/53_plywood_connected_experience.md, slice 9.
 *
 * These are READS ONLY, and they are separated from `stock.ts` because they
 * answer a different question. `stock.ts` maintains the ledger and the balance
 * it summarises; this module composes those, plus orders and pricing, into the
 * shape one screen needs. Mixing the two would put page layout concerns into
 * the module that guards the append-only invariant.
 *
 * THE CANONICAL RELATIONSHIPS, restated once and never recomputed differently
 * (taskplans/45 §4.1, taskplans/53 §3):
 *
 * ```text
 * available = on_hand - reserved
 * on_hand   = sum(stock movements)
 * value     = on_hand * weighted average cost
 * ```
 *
 * `incoming` is ordered-minus-received on OPEN purchase orders only. A
 * completed order has nothing on the way and a draft has not been placed, so
 * neither contributes.
 */

/**
 * Turns a stock movement's source into a document a screen can link to.
 *
 * A movement records the receipt or issue that caused it, and those ids are NOT
 * order ids — linking `/purchases/<receiptId>` would produce a confident link
 * to nothing. §71 asks that a movement lead back to the record that explains
 * it, and the record a warehouse operator means is the order, so the hop from
 * receipt to purchase order is resolved here rather than guessed in the page.
 *
 * Batched: one query per source type for the whole page, not one per row.
 */
type MovementSource = { sourceType: string | null; sourceId: string | null };

async function resolveMovementOrders(
  tx: TenantScopedClient,
  movements: MovementSource[],
): Promise<Map<string, { orderType: "purchase" | "sales"; orderId: string }>> {
  const receiptIds = [
    ...new Set(
      movements
        .filter((m) => m.sourceType === "goods_receipt" && m.sourceId)
        .map((m) => m.sourceId!),
    ),
  ];
  const issueIds = [
    ...new Set(
      movements
        .filter((m) => m.sourceType === "goods_issue" && m.sourceId)
        .map((m) => m.sourceId!),
    ),
  ];

  const resolved = new Map<
    string,
    { orderType: "purchase" | "sales"; orderId: string }
  >();
  if (receiptIds.length > 0) {
    const receipts = await tx.plywoodGoodsReceipt.findMany({
      where: { id: { in: receiptIds } },
      select: { id: true, purchaseOrderId: true },
    });
    for (const receipt of receipts) {
      resolved.set(receipt.id, {
        orderType: "purchase",
        orderId: receipt.purchaseOrderId,
      });
    }
  }
  if (issueIds.length > 0) {
    const issues = await tx.plywoodGoodsIssue.findMany({
      where: { id: { in: issueIds } },
      select: { id: true, salesOrderId: true },
    });
    for (const issue of issues) {
      resolved.set(issue.id, {
        orderType: "sales",
        orderId: issue.salesOrderId,
      });
    }
  }
  return resolved;
}

/** Purchase orders that still owe the business goods. */
const OPEN_PURCHASE_STATES = ["submitted", "receiving"];

/** Sales orders the business has committed to and not yet closed out. */
const OPEN_SALES_STATES = ["pending_credit", "approved", "dispatching"];

/**
 * §10 — one product, and everything currently true about it.
 *
 * The specification's own words: "This page should connect everything ...
 * Everything is clickable." So this returns ids alongside every name, because a
 * projection that returned only display strings would force the screen to
 * render dead text where §71 requires a link.
 *
 * ON THE ABSENCE OF A SELL PRICE. §10 shows a single "Sell Price" beside the
 * average cost. This capability has no such field, deliberately: a price is
 * agreed per customer (`PlywoodCustomerPrice`) or stated on the order, and
 * inventing a list price would create a number the business never quotes and
 * that no command maintains. What is returned instead is `lastSoldPricePaise`,
 * taken from the most recent invoice line — a fact rather than a policy — and
 * the per-customer prices in full. Recorded as a deviation in taskplans/55.
 */
export const productDetail: QueryDefinition<
  { productId: string },
  {
    id: string;
    name: string;
    brandId: string;
    brandName: string;
    hsnCode: string;
    grade: string;
    unitLabel: string;
    thicknessTenthMm: number | null;
    category: string;
    sizeUnit: string;
    widthTenth: number | null;
    heightTenth: number | null;
    reorderLevelUnits: number;
    active: boolean;
    onHandUnits: number;
    reservedUnits: number;
    availableUnits: number;
    incomingUnits: number;
    /// Weighted average across every reachable godown, not per godown.
    avgUnitCostPaise: number;
    valuePaise: number;
    lastSoldPricePaise: number | null;
    lowStock: boolean;
    byGodown: Array<{
      locationId: string;
      locationName: string;
      onHandUnits: number;
      reservedUnits: number;
      availableUnits: number;
      avgUnitCostPaise: number;
      valuePaise: number;
    }>;
    supplierPricing: Array<{
      supplierId: string;
      supplierName: string;
      costPaise: number;
    }>;
    customerPricing: Array<{
      customerId: string;
      customerName: string;
      pricePaise: number;
    }>;
    openPurchases: Array<{
      orderId: string;
      reference: string | null;
      supplierId: string;
      supplierName: string;
      state: string;
      qtyOrdered: number;
      qtyReceived: number;
      qtyIncoming: number;
    }>;
    openSales: Array<{
      orderId: string;
      reference: string | null;
      customerId: string;
      customerName: string;
      state: string;
      qtyOrdered: number;
      qtyShipped: number;
    }>;
    movements: Array<{
      id: string;
      kind: string;
      qtyDeltaUnits: number;
      unitCostPaise: number;
      locationId: string;
      locationName: string;
      rackLabel: string | null;
      reason: string | null;
      sourceType: string | null;
      sourceId: string | null;
      sourceNumber: string | null;
      sourceOrderType: "purchase" | "sales" | null;
      sourceOrderId: string | null;
      occurredAt: Date;
    }>;
  } | null
> = {
  key: "verity.plywood.product_detail",
  entity: ENTITY_PRODUCT,
  input: z.object({ productId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const product = await ctx.tx.plywoodProduct.findUnique({
      where: { id: input.productId },
      include: {
        brand: { select: { id: true, name: true } },
        plywoodSupplierPrices: {
          include: { supplier: { select: { id: true, displayName: true } } },
        },
        plywoodCustomerPrices: {
          include: { customer: { select: { id: true, displayName: true } } },
        },
      },
    });
    if (!product) return null;

    // Layer 2 on every stock read. Without it a godown-scoped role reads the
    // whole business's inventory through a product page — the same hole
    // `stockOnHand` closes, which this module must not reopen.
    const reachable = await reachableGodownIds(
      ctx.tx,
      ctx.actor,
      ENTITY_STOCK_BALANCE,
    );

    const [
      balances,
      reservations,
      purchaseLines,
      salesLines,
      movements,
      lastInvoiceLine,
    ] = await Promise.all([
      ctx.tx.stockBalance.findMany({
        where: { productId: product.id, locationId: { in: reachable } },
        include: { location: { select: { id: true, name: true } } },
      }),
      ctx.tx.plywoodStockReservation.findMany({
        where: {
          productId: product.id,
          locationId: { in: reachable },
          releasedAt: null,
        },
        select: { locationId: true, qtyUnits: true },
      }),
      ctx.tx.plywoodPurchaseOrderLine.findMany({
        where: {
          productId: product.id,
          purchaseOrder: {
            state: { in: OPEN_PURCHASE_STATES },
            locationId: { in: reachable },
          },
        },
        include: {
          purchaseOrder: {
            select: {
              id: true,
              reference: true,
              state: true,
              supplier: { select: { id: true, displayName: true } },
            },
          },
        },
      }),
      ctx.tx.plywoodSalesOrderLine.findMany({
        where: {
          productId: product.id,
          salesOrder: {
            state: { in: OPEN_SALES_STATES },
            locationId: { in: reachable },
          },
        },
        include: {
          salesOrder: {
            select: {
              id: true,
              reference: true,
              state: true,
              customer: { select: { id: true, displayName: true } },
            },
          },
        },
      }),
      ctx.tx.stockLedgerEntry.findMany({
        where: { productId: product.id, locationId: { in: reachable } },
        orderBy: { occurredAt: "desc" },
        take: 50,
        include: {
          location: { select: { id: true, name: true } },
          rack: { select: { rackLabel: true } },
        },
      }),
      ctx.tx.plywoodInvoiceLine.findFirst({
        where: {
          productId: product.id,
          invoice: { customerId: { not: null } },
        },
        orderBy: { invoice: { issuedAt: "desc" } },
        select: { unitPricePaise: true },
      }),
    ]);

    const sourceOrders = await resolveMovementOrders(ctx.tx, movements);

    const reservedByLocation = new Map<string, number>();
    for (const reservation of reservations) {
      reservedByLocation.set(
        reservation.locationId,
        (reservedByLocation.get(reservation.locationId) ?? 0) +
          reservation.qtyUnits,
      );
    }

    const byGodown = balances
      .map((balance) => {
        const reserved = reservedByLocation.get(balance.locationId) ?? 0;
        return {
          locationId: balance.locationId,
          locationName: balance.location.name,
          onHandUnits: balance.qtyUnits,
          reservedUnits: reserved,
          availableUnits: balance.qtyUnits - reserved,
          avgUnitCostPaise: balance.avgUnitCostPaise,
          valuePaise: balance.qtyUnits * balance.avgUnitCostPaise,
        };
      })
      .sort((a, b) => a.locationName.localeCompare(b.locationName));

    const onHandUnits = byGodown.reduce((sum, row) => sum + row.onHandUnits, 0);
    const reservedUnits = byGodown.reduce(
      (sum, row) => sum + row.reservedUnits,
      0,
    );
    const valuePaise = byGodown.reduce((sum, row) => sum + row.valuePaise, 0);
    const incomingUnits = purchaseLines.reduce(
      (sum, line) => sum + Math.max(0, line.qtyOrdered - line.qtyReceived),
      0,
    );

    return {
      id: product.id,
      name: product.name,
      brandId: product.brand.id,
      brandName: product.brand.name,
      hsnCode: product.hsnCode,
      grade: product.grade,
      unitLabel: product.unitLabel,
      thicknessTenthMm: product.thicknessTenthMm,
      category: product.category,
      sizeUnit: product.sizeUnit,
      widthTenth: product.widthTenth,
      heightTenth: product.heightTenth,
      reorderLevelUnits: product.reorderLevelUnits,
      active: product.active,
      onHandUnits,
      reservedUnits,
      availableUnits: onHandUnits - reservedUnits,
      incomingUnits,
      // Value over units, not the mean of the per-godown averages: 100 sheets
      // at ₹1,000 in one godown and 1 sheet at ₹2,000 in another average to
      // ₹1,010, not ₹1,500. Guarded because a product with no stock has no
      // average cost, and 0/0 is not zero.
      avgUnitCostPaise:
        onHandUnits > 0 ? Math.round(valuePaise / onHandUnits) : 0,
      valuePaise,
      lastSoldPricePaise: lastInvoiceLine?.unitPricePaise ?? null,
      // §17. Zero is not a reorder level — a product with no level set has not
      // opted in to low-stock alerting and must not raise one.
      lowStock:
        product.reorderLevelUnits > 0 &&
        onHandUnits - reservedUnits <= product.reorderLevelUnits,
      byGodown,
      supplierPricing: product.plywoodSupplierPrices
        .map((price) => ({
          supplierId: price.supplier.id,
          supplierName: price.supplier.displayName,
          costPaise: price.negotiatedCostPaise,
        }))
        .sort((a, b) => a.costPaise - b.costPaise),
      customerPricing: product.plywoodCustomerPrices
        .map((price) => ({
          customerId: price.customer.id,
          customerName: price.customer.displayName,
          pricePaise: price.customPricePaise,
        }))
        .sort((a, b) => a.customerName.localeCompare(b.customerName)),
      openPurchases: purchaseLines.map((line) => ({
        orderId: line.purchaseOrder.id,
        reference: line.purchaseOrder.reference,
        supplierId: line.purchaseOrder.supplier.id,
        supplierName: line.purchaseOrder.supplier.displayName,
        state: line.purchaseOrder.state,
        qtyOrdered: line.qtyOrdered,
        qtyReceived: line.qtyReceived,
        qtyIncoming: Math.max(0, line.qtyOrdered - line.qtyReceived),
      })),
      openSales: salesLines.map((line) => ({
        orderId: line.salesOrder.id,
        reference: line.salesOrder.reference,
        customerId: line.salesOrder.customer.id,
        customerName: line.salesOrder.customer.displayName,
        state: line.salesOrder.state,
        qtyOrdered: line.qtyOrdered,
        qtyShipped: line.qtyShipped,
      })),
      movements: movements.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        qtyDeltaUnits: entry.qtyDeltaUnits,
        unitCostPaise: entry.unitCostPaise,
        locationId: entry.locationId,
        locationName: entry.location.name,
        rackLabel: entry.rack?.rackLabel ?? null,
        reason: entry.reason,
        sourceOrderType: entry.sourceId
          ? (sourceOrders.get(entry.sourceId)?.orderType ?? null)
          : null,
        sourceOrderId: entry.sourceId
          ? (sourceOrders.get(entry.sourceId)?.orderId ?? null)
          : null,
        // Carried so the screen can link a movement to the order that caused
        // it (§71). Without these the movement ledger is a list of numbers
        // with no way back to the document that explains them.
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        sourceNumber: entry.sourceNumber,
        occurredAt: entry.occurredAt,
      })),
    };
  },
};

/**
 * §11 — one godown: what it holds, what is promised out of it, what is coming.
 *
 * Returns null when the godown exists but is outside the actor's scope, exactly
 * as it does when the godown does not exist. Distinguishing the two would tell
 * a warehouse operator that a site they may not read is nevertheless there.
 */
export const godownDetail: QueryDefinition<
  { locationId: string },
  {
    id: string;
    name: string;
    onHandUnits: number;
    reservedUnits: number;
    availableUnits: number;
    incomingUnits: number;
    valuePaise: number;
    racks: Array<{ id: string; rackLabel: string; active: boolean }>;
    stock: Array<{
      productId: string;
      productName: string;
      brandName: string;
      onHandUnits: number;
      reservedUnits: number;
      availableUnits: number;
      avgUnitCostPaise: number;
      valuePaise: number;
      reorderLevelUnits: number;
      lowStock: boolean;
    }>;
    incoming: Array<{
      orderId: string;
      reference: string | null;
      supplierId: string;
      supplierName: string;
      state: string;
      qtyIncoming: number;
    }>;
    movements: Array<{
      id: string;
      kind: string;
      qtyDeltaUnits: number;
      productId: string;
      productName: string;
      rackLabel: string | null;
      reason: string | null;
      sourceType: string | null;
      sourceId: string | null;
      sourceNumber: string | null;
      sourceOrderType: "purchase" | "sales" | null;
      sourceOrderId: string | null;
      occurredAt: Date;
    }>;
  } | null
> = {
  key: "verity.plywood.godown_detail",
  entity: ENTITY_STOCK_BALANCE,
  input: z.object({ locationId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const reachable = await reachableGodownIds(
      ctx.tx,
      ctx.actor,
      ENTITY_STOCK_BALANCE,
    );
    if (!reachable.includes(input.locationId)) return null;

    const location = await ctx.tx.location.findUnique({
      where: { id: input.locationId },
      select: { id: true, name: true },
    });
    if (!location) return null;

    const [balances, reservations, racks, purchaseLines, movements] =
      await Promise.all([
        ctx.tx.stockBalance.findMany({
          where: { locationId: location.id },
          include: {
            product: { include: { brand: { select: { name: true } } } },
          },
        }),
        ctx.tx.plywoodStockReservation.findMany({
          where: { locationId: location.id, releasedAt: null },
          select: { productId: true, qtyUnits: true },
        }),
        ctx.tx.godownRack.findMany({
          where: { locationId: location.id },
          orderBy: { rackLabel: "asc" },
          select: { id: true, rackLabel: true, active: true },
        }),
        ctx.tx.plywoodPurchaseOrderLine.findMany({
          where: {
            purchaseOrder: {
              locationId: location.id,
              state: { in: OPEN_PURCHASE_STATES },
            },
          },
          include: {
            purchaseOrder: {
              select: {
                id: true,
                reference: true,
                state: true,
                supplier: { select: { id: true, displayName: true } },
              },
            },
          },
        }),
        ctx.tx.stockLedgerEntry.findMany({
          where: { locationId: location.id },
          orderBy: { occurredAt: "desc" },
          take: 50,
          include: {
            product: { select: { id: true, name: true } },
            rack: { select: { rackLabel: true } },
          },
        }),
      ]);

    const sourceOrders = await resolveMovementOrders(ctx.tx, movements);

    const reservedByProduct = new Map<string, number>();
    for (const reservation of reservations) {
      reservedByProduct.set(
        reservation.productId,
        (reservedByProduct.get(reservation.productId) ?? 0) +
          reservation.qtyUnits,
      );
    }

    const stock = balances
      .map((balance) => {
        const reserved = reservedByProduct.get(balance.productId) ?? 0;
        const available = balance.qtyUnits - reserved;
        return {
          productId: balance.productId,
          productName: balance.product.name,
          brandName: balance.product.brand.name,
          onHandUnits: balance.qtyUnits,
          reservedUnits: reserved,
          availableUnits: available,
          avgUnitCostPaise: balance.avgUnitCostPaise,
          valuePaise: balance.qtyUnits * balance.avgUnitCostPaise,
          reorderLevelUnits: balance.product.reorderLevelUnits,
          lowStock:
            balance.product.reorderLevelUnits > 0 &&
            available <= balance.product.reorderLevelUnits,
        };
      })
      .sort(
        (a, b) =>
          a.brandName.localeCompare(b.brandName) ||
          a.productName.localeCompare(b.productName),
      );

    // Grouped to the order rather than listed per line: the warehouse question
    // is "what is arriving", and one order arriving is one delivery whatever
    // the line count.
    const incomingByOrder = new Map<
      string,
      {
        orderId: string;
        reference: string | null;
        supplierId: string;
        supplierName: string;
        state: string;
        qtyIncoming: number;
      }
    >();
    for (const line of purchaseLines) {
      const outstanding = Math.max(0, line.qtyOrdered - line.qtyReceived);
      if (outstanding === 0) continue;
      const existing = incomingByOrder.get(line.purchaseOrder.id) ?? {
        orderId: line.purchaseOrder.id,
        reference: line.purchaseOrder.reference,
        supplierId: line.purchaseOrder.supplier.id,
        supplierName: line.purchaseOrder.supplier.displayName,
        state: line.purchaseOrder.state,
        qtyIncoming: 0,
      };
      existing.qtyIncoming += outstanding;
      incomingByOrder.set(line.purchaseOrder.id, existing);
    }
    const incoming = [...incomingByOrder.values()];

    return {
      id: location.id,
      name: location.name,
      onHandUnits: stock.reduce((sum, row) => sum + row.onHandUnits, 0),
      reservedUnits: stock.reduce((sum, row) => sum + row.reservedUnits, 0),
      availableUnits: stock.reduce((sum, row) => sum + row.availableUnits, 0),
      incomingUnits: incoming.reduce((sum, row) => sum + row.qtyIncoming, 0),
      valuePaise: stock.reduce((sum, row) => sum + row.valuePaise, 0),
      racks,
      stock,
      incoming,
      movements: movements.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        qtyDeltaUnits: entry.qtyDeltaUnits,
        productId: entry.productId,
        productName: entry.product.name,
        rackLabel: entry.rack?.rackLabel ?? null,
        reason: entry.reason,
        sourceOrderType: entry.sourceId
          ? (sourceOrders.get(entry.sourceId)?.orderType ?? null)
          : null,
        sourceOrderId: entry.sourceId
          ? (sourceOrders.get(entry.sourceId)?.orderId ?? null)
          : null,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        sourceNumber: entry.sourceNumber,
        occurredAt: entry.occurredAt,
      })),
    };
  },
};

/**
 * §13 — why a quantity is what it is.
 *
 * The specification calls this "critical for warehouse staff and accountants",
 * and it is the screen that makes §9's rule enforceable: stock is never
 * hand-edited, so every sheet on hand traces to a movement that says who moved
 * it and why.
 *
 * Ordered OLDEST FIRST, unlike the recent-activity lists elsewhere, because a
 * running balance that counts downwards from the present is not a running
 * balance. The closing figure must be the last row.
 */
export const stockLedger: QueryDefinition<
  { productId: string; locationId?: string; limit?: number },
  {
    productId: string;
    productName: string;
    locationId: string | null;
    locationName: string | null;
    closingUnits: number;
    entries: Array<{
      id: string;
      kind: string;
      qtyDeltaUnits: number;
      unitCostPaise: number;
      locationId: string;
      locationName: string;
      rackLabel: string | null;
      reason: string | null;
      sourceType: string | null;
      sourceId: string | null;
      sourceNumber: string | null;
      sourceOrderType: "purchase" | "sales" | null;
      sourceOrderId: string | null;
      occurredAt: Date;
      runningBalanceUnits: number;
    }>;
  } | null
> = {
  key: "verity.plywood.stock_ledger",
  entity: ENTITY_STOCK_LEDGER,
  input: z.object({
    productId: z.string().uuid(),
    locationId: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(1000).optional(),
  }),
  handler: async (ctx, input) => {
    const reachable = await reachableGodownIds(
      ctx.tx,
      ctx.actor,
      ENTITY_STOCK_LEDGER,
    );

    const product = await ctx.tx.plywoodProduct.findUnique({
      where: { id: input.productId },
      select: { id: true, name: true },
    });
    if (!product) return null;

    // An explicit godown is INTERSECTED with the reachable set rather than
    // replacing it, so naming another branch's godown returns nothing instead
    // of returning its ledger.
    const locationIds = input.locationId
      ? reachable.filter((id) => id === input.locationId)
      : reachable;

    const entries = await ctx.tx.stockLedgerEntry.findMany({
      where: { productId: product.id, locationId: { in: locationIds } },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      take: input.limit ?? 500,
      include: {
        location: { select: { id: true, name: true } },
        rack: { select: { rackLabel: true } },
      },
    });

    const sourceOrders = await resolveMovementOrders(ctx.tx, entries);

    let running = 0;
    const rows = entries.map((entry) => {
      running += entry.qtyDeltaUnits;
      return {
        id: entry.id,
        kind: entry.kind,
        qtyDeltaUnits: entry.qtyDeltaUnits,
        unitCostPaise: entry.unitCostPaise,
        locationId: entry.locationId,
        locationName: entry.location.name,
        rackLabel: entry.rack?.rackLabel ?? null,
        reason: entry.reason,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        sourceNumber: entry.sourceNumber,
        sourceOrderType: entry.sourceId
          ? (sourceOrders.get(entry.sourceId)?.orderType ?? null)
          : null,
        sourceOrderId: entry.sourceId
          ? (sourceOrders.get(entry.sourceId)?.orderId ?? null)
          : null,
        occurredAt: entry.occurredAt,
        runningBalanceUnits: running,
      };
    });

    const named =
      input.locationId && locationIds.length === 1
        ? (entries[0]?.location ?? null)
        : null;

    return {
      productId: product.id,
      productName: product.name,
      locationId:
        input.locationId && locationIds.length === 1 ? input.locationId : null,
      locationName: named?.name ?? null,
      closingUnits: running,
      entries: rows,
    };
  },
};

/**
 * What can actually be sold, per board, per godown, with the agreed price.
 *
 * Audit findings U0-1 and U1-8. The sales-order form asked for a godown and a
 * board and told the salesperson nothing about either: not whether that godown
 * held any, and not what the customer's agreed price was. The result was an
 * order that could be created and APPROVED and then failed at reservation —
 * after the customer had been told yes — with an error that named neither the
 * quantity available elsewhere nor the missing price.
 *
 * Returned for every reachable godown at once rather than per selection, so the
 * form can react as the user changes either dropdown without another round
 * trip, and can show availability on the option itself.
 */
export const sellableStock: QueryDefinition<
  { customerId?: string },
  Array<{
    productId: string;
    productName: string;
    brandName: string;
    /// SERVICE products are excluded — they are not held in a godown.
    locationId: string;
    locationName: string;
    onHandUnits: number;
    reservedUnits: number;
    availableUnits: number;
    /// The customer's agreed price, when one was asked for and exists.
    agreedPricePaise: number | null;
    /**
     * The GST rate in force for this board's HSN today, in basis points —
     * 1800 for 18%.
     *
     * The COMBINED rate, deliberately, not a CGST/SGST/IGST split. The form
     * needs it to show an order total including tax before the order is placed,
     * and 18% is 18% whether it is collected as 9+9 within the state or as 18
     * across a border, so the split would be three numbers the form could get
     * wrong for no gain. Null when no rule covers the HSN — the form then says
     * the tax is unknown rather than showing a total that is short.
     */
    taxRateBp: number | null;
  }>
> = {
  key: "verity.plywood.sellable_stock",
  entity: ENTITY_STOCK_BALANCE,
  input: z.object({ customerId: z.string().uuid().optional() }),
  handler: async (ctx, input) => {
    const reachable = await reachableGodownIds(
      ctx.tx,
      ctx.actor,
      ENTITY_STOCK_BALANCE,
    );

    const [balances, reservations, prices] = await Promise.all([
      ctx.tx.stockBalance.findMany({
        where: {
          locationId: { in: reachable },
          product: { active: true, type: "PHYSICAL" },
        },
        include: {
          product: { include: { brand: { select: { name: true } } } },
          location: { select: { name: true } },
        },
      }),
      ctx.tx.plywoodStockReservation.findMany({
        where: { locationId: { in: reachable }, releasedAt: null },
        select: { productId: true, locationId: true, qtyUnits: true },
      }),
      input.customerId
        ? ctx.tx.plywoodCustomerPrice.findMany({
            where: { customerId: input.customerId },
            select: { productId: true, customPricePaise: true },
          })
        : Promise.resolve([]),
    ]);

    // The rate in force today for every HSN on the shelf, resolved once rather
    // than per row: a catalogue of four hundred boards shares a handful of HSN
    // codes between them.
    const registration = await ctx.tx.plywoodGstRegistration.findFirst({
      where: { active: true },
    });
    const rateByHsn = new Map<string, number>();
    if (registration) {
      const now = new Date();
      for (const hsn of new Set(balances.map((b) => b.product.hsnCode))) {
        if (!hsn) continue;
        try {
          const rate = await resolveTaxRate(ctx.tx, {
            registrationId: registration.id,
            hsnCode: hsn,
            on: now,
          });
          rateByHsn.set(hsn, rate.cgstRateBp + rate.sgstRateBp);
        } catch {
          // No rule for this HSN. Left absent so the form can say the tax is
          // unknown; guessing a rate here would show a total that is wrong in
          // the direction nobody checks.
        }
      }
    }

    const reservedBy = new Map<string, number>();
    for (const hold of reservations) {
      const key = `${hold.productId}:${hold.locationId}`;
      reservedBy.set(key, (reservedBy.get(key) ?? 0) + hold.qtyUnits);
    }
    const priceBy = new Map(
      prices.map((price) => [price.productId, price.customPricePaise]),
    );

    return balances
      .map((balance) => {
        const reserved =
          reservedBy.get(`${balance.productId}:${balance.locationId}`) ?? 0;
        return {
          productId: balance.productId,
          productName: balance.product.name,
          brandName: balance.product.brand.name,
          locationId: balance.locationId,
          locationName: balance.location.name,
          onHandUnits: balance.qtyUnits,
          reservedUnits: reserved,
          availableUnits: balance.qtyUnits - reserved,
          agreedPricePaise: priceBy.get(balance.productId) ?? null,
          taxRateBp: rateByHsn.get(balance.product.hsnCode) ?? null,
        };
      })
      .sort(
        (a, b) =>
          a.locationName.localeCompare(b.locationName) ||
          a.brandName.localeCompare(b.brandName) ||
          a.productName.localeCompare(b.productName),
      );
  },
};

/**
 * Every agreed supplier price, flat.
 *
 * TASK 71 ITEM 8 — "if I have set an agreed price for a supplier, it should
 * autofill the price per unit." The command has always fallen back to the
 * negotiated price when the cost is left blank, but the form could not SHOW
 * that price, so the buyer had a box labelled "blank uses agreed price" and no
 * way to know what would happen. The sales desk already solved this; the
 * purchase desk had no equivalent read.
 *
 * Flat rather than nested by supplier: the form needs a lookup keyed on
 * (supplier, product) and rebuilding that from a nested shape on every
 * keystroke is work the query can do once.
 */
export const supplierPrices: QueryDefinition<
  Record<string, never>,
  Array<{
    supplierId: string;
    productId: string;
    negotiatedCostPaise: number;
  }>
> = {
  key: "verity.plywood.supplier_prices",
  entity: ENTITY_PRODUCT,
  input: z.object({}),
  handler: async (ctx) => {
    const rows = await ctx.tx.plywoodSupplierPrice.findMany({
      select: {
        supplierId: true,
        productId: true,
        negotiatedCostPaise: true,
      },
    });
    return rows;
  },
};


/**
 * Every agreed customer price, flat — the selling-side twin of `supplierPrices`.
 */
export const customerPrices: QueryDefinition<
  Record<string, never>,
  Array<{ customerId: string; productId: string; customPricePaise: number }>
> = {
  key: "verity.plywood.customer_prices",
  entity: ENTITY_PRODUCT,
  input: z.object({}),
  handler: async (ctx) => {
    return ctx.tx.plywoodCustomerPrice.findMany({
      select: { customerId: true, productId: true, customPricePaise: true },
    });
  },
};
