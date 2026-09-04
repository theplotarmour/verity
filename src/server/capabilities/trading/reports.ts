import { z } from "zod";
import { reachableGodownIds } from "./scope";
import { businessZone, startOfBusinessDay } from "./clock";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import {
  ENTITY_INVOICE,
  ENTITY_PURCHASE_ORDER,
  ENTITY_STOCK_BALANCE,
} from "./keys";

/**
 * PLYWOOD — the reports §73 names.
 *
 * Every one of these is a GROUPING of records that already exist. Nothing is
 * estimated, nothing is stored, and there is no report table to fall out of
 * date. §73 ends "every report drills into source records", so each row carries
 * the id of whatever it groups by.
 *
 * A WINDOW IS ALWAYS EXPLICIT. Each query takes `sinceDays` and states the
 * window it used in its result. A figure whose period the reader has to infer
 * is a figure they will misread eventually, and "revenue" without "over what"
 * is not an answer.
 */

/** Default reporting window. A month is the period a plywood business thinks in. */
const DEFAULT_DAYS = 30;

/**
 * The start of a rolling window, counted back from the start of the business's
 * TODAY rather than from the current instant (U0-3).
 *
 * Counting back from "now" makes a report's window slide through the day, so
 * the same report run twice in one afternoon covers different periods and its
 * figures move for no business reason. Anchoring to local midnight makes a
 * "last 30 days" report stable for the whole day, which is what a person
 * comparing two runs assumes.
 */
function windowStart(zone: string, sinceDays: number | undefined): Date {
  const today = startOfBusinessDay(zone);
  return new Date(today.getTime() - (sinceDays ?? DEFAULT_DAYS) * 86_400_000);
}

/**
 * §73 Sales — revenue and quantity, by product and by customer.
 *
 * ON "BY SALESPERSON", which §73 also asks for: an order records no
 * salesperson. `Activity` records which user ran `create_sales_order`, but that
 * is who keyed it, which is not the same fact and is wrong the moment an
 * accountant enters a phone order. Attributing revenue to the wrong person is
 * worse than not attributing it, so it is left out and recorded as a deviation
 * rather than approximated. It needs a field on the order.
 */
export const salesAnalysis: QueryDefinition<
  { sinceDays?: number },
  {
    sinceDays: number;
    from: Date;
    revenuePaise: number;
    taxPaise: number;
    qtyUnits: number;
    invoiceCount: number;
    byProduct: Array<{
      productId: string;
      productName: string;
      qtyUnits: number;
      revenuePaise: number;
    }>;
    byCustomer: Array<{
      customerId: string;
      customerName: string;
      invoiceCount: number;
      revenuePaise: number;
    }>;
  }
> = {
  key: "verity.trading.sales_analysis",
  entity: ENTITY_INVOICE,
  input: z.object({ sinceDays: z.number().int().min(1).max(3650).optional() }),
  handler: async (ctx, input) => {
    const from = windowStart(await businessZone(ctx), input.sinceDays);
    const invoices = await ctx.tx.tradingInvoice.findMany({
      where: { customerId: { not: null }, issuedAt: { gte: from } },
      include: {
        lines: true,
        customer: { select: { id: true, displayName: true } },
      },
    });

    const byProduct = new Map<
      string,
      { productName: string; qtyUnits: number; revenuePaise: number }
    >();
    const byCustomer = new Map<
      string,
      { customerName: string; invoiceCount: number; revenuePaise: number }
    >();

    let revenuePaise = 0;
    let taxPaise = 0;
    let qtyUnits = 0;

    for (const invoice of invoices) {
      // Revenue is the TAXABLE value, not the invoice total. Tax collected is
      // the government's money passing through, and counting it as revenue
      // overstates the business by the whole GST rate.
      revenuePaise += invoice.taxablePaise;
      taxPaise += invoice.cgstPaise + invoice.sgstPaise + invoice.igstPaise;

      if (invoice.customer) {
        const existing = byCustomer.get(invoice.customer.id) ?? {
          customerName: invoice.customer.displayName,
          invoiceCount: 0,
          revenuePaise: 0,
        };
        existing.invoiceCount += 1;
        existing.revenuePaise += invoice.taxablePaise;
        byCustomer.set(invoice.customer.id, existing);
      }

      for (const line of invoice.lines) {
        qtyUnits += line.qtyUnits;
        const existing = byProduct.get(line.productId) ?? {
          productName: line.productNameSnapshot,
          qtyUnits: 0,
          revenuePaise: 0,
        };
        existing.qtyUnits += line.qtyUnits;
        existing.revenuePaise += line.lineTotalPaise;
        byProduct.set(line.productId, existing);
      }
    }

    return {
      sinceDays: input.sinceDays ?? DEFAULT_DAYS,
      from,
      revenuePaise,
      taxPaise,
      qtyUnits,
      invoiceCount: invoices.length,
      byProduct: [...byProduct.entries()]
        .map(([productId, row]) => ({ productId, ...row }))
        .sort((a, b) => b.revenuePaise - a.revenuePaise),
      byCustomer: [...byCustomer.entries()]
        .map(([customerId, row]) => ({ customerId, ...row }))
        .sort((a, b) => b.revenuePaise - a.revenuePaise),
    };
  },
};

/** §73 Purchases — value by supplier and product, and how prices have moved. */
export const purchaseAnalysis: QueryDefinition<
  { sinceDays?: number },
  {
    sinceDays: number;
    from: Date;
    purchaseValuePaise: number;
    qtyUnits: number;
    orderCount: number;
    bySupplier: Array<{
      supplierId: string;
      supplierName: string;
      orderCount: number;
      valuePaise: number;
    }>;
    byProduct: Array<{
      productId: string;
      productName: string;
      qtyUnits: number;
      valuePaise: number;
    }>;
    /// §16 — what each supplier charges now against what they charged then.
    priceTrend: Array<{
      productId: string;
      productName: string;
      supplierId: string;
      supplierName: string;
      firstCostPaise: number;
      latestCostPaise: number;
      changePaise: number;
    }>;
  }
> = {
  key: "verity.trading.purchase_analysis",
  entity: ENTITY_PURCHASE_ORDER,
  input: z.object({ sinceDays: z.number().int().min(1).max(3650).optional() }),
  handler: async (ctx, input) => {
    const from = windowStart(await businessZone(ctx), input.sinceDays);
    const orders = await ctx.tx.tradingPurchaseOrder.findMany({
      // Drafts are excluded: a draft is a note to self, not a purchase, and
      // counting one as spend reports money the business has not committed.
      where: { createdAt: { gte: from }, state: { not: "draft" } },
      include: {
        lines: true,
        supplier: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const bySupplier = new Map<
      string,
      { supplierName: string; orderCount: number; valuePaise: number }
    >();
    const byProduct = new Map<
      string,
      { productName: string; qtyUnits: number; valuePaise: number }
    >();
    // Keyed on supplier+product, holding the first and latest price seen in
    // the window. Two ends of a line, not a full series: the question §16 asks
    // is "has this got dearer", and a chart of every order answers it slower.
    const trend = new Map<
      string,
      {
        productId: string;
        productName: string;
        supplierId: string;
        supplierName: string;
        firstCostPaise: number;
        latestCostPaise: number;
      }
    >();

    let purchaseValuePaise = 0;
    let qtyUnits = 0;

    for (const order of orders) {
      const orderValue = order.lines.reduce(
        (sum, line) => sum + line.qtyOrdered * line.unitCostPaise,
        0,
      );
      purchaseValuePaise += orderValue;

      const supplierRow = bySupplier.get(order.supplier.id) ?? {
        supplierName: order.supplier.displayName,
        orderCount: 0,
        valuePaise: 0,
      };
      supplierRow.orderCount += 1;
      supplierRow.valuePaise += orderValue;
      bySupplier.set(order.supplier.id, supplierRow);

      for (const line of order.lines) {
        qtyUnits += line.qtyOrdered;
        const productRow = byProduct.get(line.productId) ?? {
          productName: line.productNameSnapshot,
          qtyUnits: 0,
          valuePaise: 0,
        };
        productRow.qtyUnits += line.qtyOrdered;
        productRow.valuePaise += line.qtyOrdered * line.unitCostPaise;
        byProduct.set(line.productId, productRow);

        const key = `${order.supplier.id}:${line.productId}`;
        const existing = trend.get(key);
        if (existing) {
          // Orders are read oldest first, so the last one seen is the latest.
          existing.latestCostPaise = line.unitCostPaise;
        } else {
          trend.set(key, {
            productId: line.productId,
            productName: line.productNameSnapshot,
            supplierId: order.supplier.id,
            supplierName: order.supplier.displayName,
            firstCostPaise: line.unitCostPaise,
            latestCostPaise: line.unitCostPaise,
          });
        }
      }
    }

    return {
      sinceDays: input.sinceDays ?? DEFAULT_DAYS,
      from,
      purchaseValuePaise,
      qtyUnits,
      orderCount: orders.length,
      bySupplier: [...bySupplier.entries()]
        .map(([supplierId, row]) => ({ supplierId, ...row }))
        .sort((a, b) => b.valuePaise - a.valuePaise),
      byProduct: [...byProduct.entries()]
        .map(([productId, row]) => ({ productId, ...row }))
        .sort((a, b) => b.valuePaise - a.valuePaise),
      // Only the ones that actually moved. A list where most rows read "no
      // change" buries the two that matter.
      priceTrend: [...trend.values()]
        .map((row) => ({
          ...row,
          changePaise: row.latestCostPaise - row.firstCostPaise,
        }))
        .filter((row) => row.changePaise !== 0)
        .sort((a, b) => Math.abs(b.changePaise) - Math.abs(a.changePaise)),
    };
  },
};

/**
 * §73 Inventory — valuation, ageing, damage and adjustments.
 *
 * AGEING IS MEASURED FROM THE LAST INWARD MOVEMENT, not from a purchase date
 * the balance does not carry. That is the honest reading of what this system
 * records: how long since anything was added to this pile. It is stated on the
 * screen rather than left for the reader to assume it means something stricter.
 */
export const inventoryAnalysis: QueryDefinition<
  { sinceDays?: number },
  {
    sinceDays: number;
    from: Date;
    valuePaise: number;
    qtyUnits: number;
    ageing: Array<{
      bucket: string;
      qtyUnits: number;
      valuePaise: number;
    }>;
    damage: Array<{
      productId: string;
      productName: string;
      qtyUnits: number;
      valuePaise: number;
      reason: string | null;
      locationName: string;
      occurredAt: Date;
    }>;
    adjustments: Array<{
      productId: string;
      productName: string;
      qtyDeltaUnits: number;
      reason: string | null;
      locationName: string;
      occurredAt: Date;
    }>;
    damageValuePaise: number;
    adjustmentCount: number;
  }
> = {
  key: "verity.trading.inventory_analysis",
  entity: ENTITY_STOCK_BALANCE,
  input: z.object({ sinceDays: z.number().int().min(1).max(3650).optional() }),
  handler: async (ctx, input) => {
    const from = windowStart(await businessZone(ctx), input.sinceDays);
    const reachable = await reachableGodownIds(
      ctx.tx,
      ctx.actor,
      ENTITY_STOCK_BALANCE,
    );

    const [balances, movements] = await Promise.all([
      ctx.tx.stockBalance.findMany({
        where: { locationId: { in: reachable }, qtyUnits: { gt: 0 } },
        include: { product: { select: { id: true, name: true } } },
      }),
      ctx.tx.stockLedgerEntry.findMany({
        where: {
          locationId: { in: reachable },
          kind: { in: ["damaged_out", "adjust_in", "adjust_out"] },
          occurredAt: { gte: from },
        },
        orderBy: { occurredAt: "desc" },
        include: {
          product: { select: { id: true, name: true } },
          location: { select: { name: true } },
        },
      }),
    ]);

    // Last inward movement per product+godown, for ageing.
    const lastInward = await ctx.tx.stockLedgerEntry.groupBy({
      by: ["productId", "locationId"],
      where: { locationId: { in: reachable }, qtyDeltaUnits: { gt: 0 } },
      _max: { occurredAt: true },
    });
    const lastInwardAt = new Map(
      lastInward.map((row) => [
        `${row.productId}:${row.locationId}`,
        row._max.occurredAt,
      ]),
    );

    const buckets = [
      { bucket: "Under 30 days", max: 30 },
      { bucket: "30 to 90 days", max: 90 },
      { bucket: "90 to 180 days", max: 180 },
      { bucket: "Over 180 days", max: Number.POSITIVE_INFINITY },
    ].map((b) => ({ ...b, qtyUnits: 0, valuePaise: 0 }));

    for (const balance of balances) {
      const at = lastInwardAt.get(`${balance.productId}:${balance.locationId}`);
      // No inward movement recorded means opening stock, which is the oldest
      // thing in the godown — placed in the last bucket rather than the first,
      // because guessing "new" understates ageing and is the flattering error.
      const days = at
        ? Math.floor((Date.now() - at.getTime()) / 86_400_000)
        : Number.POSITIVE_INFINITY;
      const bucket =
        buckets.find((b) => days < b.max) ?? buckets[buckets.length - 1]!;
      bucket.qtyUnits += balance.qtyUnits;
      bucket.valuePaise += balance.qtyUnits * balance.avgUnitCostPaise;
    }

    const damage = movements
      .filter((entry) => entry.kind === "damaged_out")
      .map((entry) => ({
        productId: entry.productId,
        productName: entry.product.name,
        qtyUnits: Math.abs(entry.qtyDeltaUnits),
        valuePaise: Math.abs(entry.qtyDeltaUnits) * entry.unitCostPaise,
        reason: entry.reason,
        locationName: entry.location.name,
        occurredAt: entry.occurredAt,
      }));

    return {
      sinceDays: input.sinceDays ?? DEFAULT_DAYS,
      from,
      valuePaise: balances.reduce(
        (sum, b) => sum + b.qtyUnits * b.avgUnitCostPaise,
        0,
      ),
      qtyUnits: balances.reduce((sum, b) => sum + b.qtyUnits, 0),
      ageing: buckets.map(({ bucket, qtyUnits, valuePaise }) => ({
        bucket,
        qtyUnits,
        valuePaise,
      })),
      damage,
      adjustments: movements
        .filter((entry) => entry.kind !== "damaged_out")
        .map((entry) => ({
          productId: entry.productId,
          productName: entry.product.name,
          qtyDeltaUnits: entry.qtyDeltaUnits,
          reason: entry.reason,
          locationName: entry.location.name,
          occurredAt: entry.occurredAt,
        })),
      damageValuePaise: damage.reduce((sum, row) => sum + row.valuePaise, 0),
      adjustmentCount: movements.filter((entry) => entry.kind !== "damaged_out")
        .length,
    };
  },
};

/**
 * §73 Finance — receivable and payable ageing, side by side.
 *
 * Ageing is by invoice AGE, because this capability records no payment terms.
 * Presenting age buckets as though they were overdue buckets would assert a
 * due date the business never agreed, so the buckets are labelled by age and
 * the screen says so.
 */
export const financeAgeing: QueryDefinition<
  Record<string, never>,
  {
    receivable: Array<{
      bucket: string;
      amountPaise: number;
      invoiceCount: number;
    }>;
    payable: Array<{
      bucket: string;
      amountPaise: number;
      invoiceCount: number;
    }>;
    receivableTotalPaise: number;
    payableTotalPaise: number;
  }
> = {
  key: "verity.trading.finance_ageing",
  entity: ENTITY_INVOICE,
  input: z.object({}),
  handler: async (ctx) => {
    const invoices = await ctx.tx.tradingInvoice.findMany({
      include: {
        payments: { select: { amountPaise: true } },
        notes: { select: { noteType: true, totalPaise: true } },
      },
    });

    const shape = () =>
      [
        { bucket: "Under 30 days", max: 30 },
        { bucket: "30 to 60 days", max: 60 },
        { bucket: "60 to 90 days", max: 90 },
        { bucket: "Over 90 days", max: Number.POSITIVE_INFINITY },
      ].map((b) => ({ ...b, amountPaise: 0, invoiceCount: 0 }));

    const receivable = shape();
    const payable = shape();

    for (const invoice of invoices) {
      const paid = invoice.payments.reduce((sum, p) => sum + p.amountPaise, 0);
      const credited = invoice.notes
        .filter((n) => n.noteType === "credit")
        .reduce((sum, n) => sum + n.totalPaise, 0);
      const debited = invoice.notes
        .filter((n) => n.noteType === "debit")
        .reduce((sum, n) => sum + n.totalPaise, 0);
      const outstanding = Math.max(
        0,
        invoice.totalPaise + debited - paid - credited,
      );
      if (outstanding === 0) continue;

      const days = Math.floor(
        (Date.now() - invoice.issuedAt.getTime()) / 86_400_000,
      );
      const into = invoice.customerId ? receivable : payable;
      const bucket = into.find((b) => days < b.max) ?? into[into.length - 1]!;
      bucket.amountPaise += outstanding;
      bucket.invoiceCount += 1;
    }

    const strip = (rows: ReturnType<typeof shape>) =>
      rows.map(({ bucket, amountPaise, invoiceCount }) => ({
        bucket,
        amountPaise,
        invoiceCount,
      }));

    return {
      receivable: strip(receivable),
      payable: strip(payable),
      receivableTotalPaise: receivable.reduce(
        (sum, b) => sum + b.amountPaise,
        0,
      ),
      payableTotalPaise: payable.reduce((sum, b) => sum + b.amountPaise, 0),
    };
  },
};

export function registerReports(): void {
  registerQuery(salesAnalysis);
  registerQuery(purchaseAnalysis);
  registerQuery(inventoryAnalysis);
  registerQuery(financeAgeing);
}
