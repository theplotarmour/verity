import { z } from "zod";
import { reachableGodownIds } from "../trading/scope";
import {
  resolveMovementOrders,
  OPEN_PURCHASE_STATES,
  OPEN_SALES_STATES,
} from "../trading/views";
import { type QueryDefinition } from "@/server/platform/query";
import { ENTITY_PRODUCT, ENTITY_STOCK_BALANCE } from "../trading/keys";

/**
 * §10 — one product, and everything currently true about it.
 *
 * ADR-018: split out of `trading/views.ts` because this query returns board
 * dimension/grade fields — plywood's own `PlywoodProductDetail` extension of
 * the generic `TradingProduct` — which `trading` must not know about.
 * Everything else here (stock, orders, pricing) is `trading`'s own data,
 * reused via `resolveMovementOrders`/`OPEN_PURCHASE_STATES`/`OPEN_SALES_STATES`
 * rather than re-derived.
 *
 * The specification's own words: "This page should connect everything ...
 * Everything is clickable." So this returns ids alongside every name, because a
 * projection that returned only display strings would force the screen to
 * render dead text where §71 requires a link.
 *
 * ON THE ABSENCE OF A SELL PRICE. §10 shows a single "Sell Price" beside the
 * average cost. This capability has no such field, deliberately: a price is
 * agreed per customer (`TradingCustomerPrice`) or stated on the order, and
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
    const product = await ctx.tx.tradingProduct.findUnique({
      where: { id: input.productId },
      include: {
        brand: { select: { id: true, name: true } },
        supplierPrices: {
          include: { supplier: { select: { id: true, displayName: true } } },
        },
        customerPrices: {
          include: { customer: { select: { id: true, displayName: true } } },
        },
        plywoodDetail: true,
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
      ctx.tx.tradingStockReservation.findMany({
        where: {
          productId: product.id,
          locationId: { in: reachable },
          releasedAt: null,
        },
        select: { locationId: true, qtyUnits: true },
      }),
      ctx.tx.tradingPurchaseOrderLine.findMany({
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
      ctx.tx.tradingSalesOrderLine.findMany({
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
      ctx.tx.tradingInvoiceLine.findFirst({
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
      grade: product.plywoodDetail?.grade ?? "",
      unitLabel: product.unitLabel,
      thicknessTenthMm: product.plywoodDetail?.thicknessTenthMm ?? null,
      category: product.plywoodDetail?.category ?? "OTHER",
      sizeUnit: product.plywoodDetail?.sizeUnit ?? "MM",
      widthTenth: product.plywoodDetail?.widthTenth ?? null,
      heightTenth: product.plywoodDetail?.heightTenth ?? null,
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
      supplierPricing: product.supplierPrices
        .map((price) => ({
          supplierId: price.supplier.id,
          supplierName: price.supplier.displayName,
          costPaise: price.negotiatedCostPaise,
        }))
        .sort((a, b) => a.costPaise - b.costPaise),
      customerPricing: product.customerPrices
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
