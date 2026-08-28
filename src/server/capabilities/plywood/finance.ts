import { z } from "zod";
import { ValidationError, type CommandDefinition } from "@/server/platform/command";
import { type QueryDefinition } from "@/server/platform/query";
import { resolveConfig } from "@/server/platform/capability";
import type { TenantScopedClient } from "@/server/platform/tenancy";
import {
  CONFIG_CGST_RATE_BP,
  CONFIG_IGST_RATE_BP,
  CONFIG_SGST_RATE_BP,
  CONFIG_TENANT_STATE_CODE,
  ENTITY_INVOICE,
  ENTITY_LEDGER_ENTRY,
  ENTITY_PAYMENT,
} from "./keys";

/**
 * PLYWOOD STAGE 6 — finance.
 *
 * Requirement source: plywood.md §1.4 and §1.5. Three decisions from
 * implementation/plywood-decisions.md land here.
 *
 * P2 — invoice numbers come from a counter row locked inside the invoice
 * transaction. Gapless is a legal requirement under GST, and a PostgreSQL
 * sequence cannot deliver it: sequences are non-transactional by design, so a
 * rolled-back invoice burns its number and the client explains the gap to a tax
 * officer.
 *
 * P3 — a party's balance is derived from the append-only ledger. Nothing caches
 * it. When a cache and a ledger disagree, nobody can say which is right.
 *
 * P4 — place of supply decides CGST + SGST against IGST. The rule is one
 * function, and it is deliberately NOT shared with Kent's: different rules,
 * capability-private both times. Merging them is how a "generic tax engine" gets
 * born.
 */

/* ================================== tax =================================== */

/**
 * A configuration value read as a number.
 *
 * `setConfig` stores JSON, and the two writers disagree about type: a test
 * writes `900`, while the Configuration screen writes what the operator typed,
 * which is `"900"`. JavaScript would coerce the string through the arithmetic
 * below and produce the right answer by accident — until somebody types `9 %`
 * and gets `NaN` silently folded into a tax figure.
 *
 * So it is converted once, here, and a value that is not a number is refused
 * rather than propagated. Tax is the last place to trust coercion.
 */
function configNumber(value: unknown, key: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`E_VALIDATION: ${key} is not a number (${String(value)})`);
  }
  return parsed;
}

/**
 * Indian financial years run April to March, so a calendar year would split an
 * invoice series across two of them — and a series that restarts mid-year is not
 * the gapless sequence GST asks for.
 */
export function financialYearOf(instant: Date): string {
  const year = instant.getUTCFullYear();
  const month = instant.getUTCMonth(); // 0-based; March is 2.
  const start = month >= 3 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/**
 * The place-of-supply rule (P4), whole, in one function.
 *
 * Same state is an intra-state supply and attracts CGST + SGST; different states
 * is inter-state and attracts IGST. Rates arrive in basis points — 2.5% is 250 —
 * because a percentage stored as a float is a rounding error waiting for a
 * filing.
 */
export function computeInvoiceTax(input: {
  taxablePaise: number;
  supplyStateCode: string;
  placeOfSupplyStateCode: string;
  cgstRateBp: number;
  sgstRateBp: number;
  igstRateBp: number;
}): {
  interState: boolean;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
} {
  const interState = input.supplyStateCode !== input.placeOfSupplyStateCode;

  const cgstPaise = interState ? 0 : Math.round((input.taxablePaise * input.cgstRateBp) / 10_000);
  const sgstPaise = interState ? 0 : Math.round((input.taxablePaise * input.sgstRateBp) / 10_000);
  const igstPaise = interState ? Math.round((input.taxablePaise * input.igstRateBp) / 10_000) : 0;

  return {
    interState,
    cgstPaise,
    sgstPaise,
    igstPaise,
    // No invoice-level rounding to the nearest rupee here, unlike Kent's bill:
    // a tax invoice must foot exactly to its own parts, and the CHECK constraint
    // on the column enforces that.
    totalPaise: input.taxablePaise + cgstPaise + sgstPaise + igstPaise,
  };
}

/**
 * Takes the next number in a series, gaplessly (P2).
 *
 * `SELECT ... FOR UPDATE` on the counter row inside the caller's transaction, so
 * two invoices raised at the same moment serialise rather than colliding, and a
 * rollback returns the number instead of burning it. The cost is that invoice
 * creation serialises per series; at this business's volume that is nothing.
 */
async function nextInvoiceNumber(
  tx: TenantScopedClient,
  tenantId: string,
  seriesKey: string,
  financialYear: string,
): Promise<{ seriesId: string; sequenceNumber: number; invoiceNumber: string }> {
  const locked = await tx.$queryRaw<{ id: string; next_number: number }[]>`
    SELECT id, next_number
      FROM plywood_invoice_series
     WHERE series_key = ${seriesKey}
       AND financial_year = ${financialYear}
     FOR UPDATE`;

  let seriesId: string;
  let sequenceNumber: number;

  if (locked[0]) {
    seriesId = locked[0].id;
    sequenceNumber = locked[0].next_number;
    await tx.plywoodInvoiceSeries.update({
      where: { id: seriesId },
      data: { nextNumber: sequenceNumber + 1, version: { increment: 1 } },
    });
  } else {
    // First invoice in this series this year. The unique index on
    // (tenant, series, year) is what resolves two callers racing to create it.
    const created = await tx.plywoodInvoiceSeries.create({
      data: { tenantId, seriesKey, financialYear, nextNumber: 2 },
    });
    seriesId = created.id;
    sequenceNumber = 1;
  }

  return {
    seriesId,
    sequenceNumber,
    invoiceNumber: `${seriesKey}/${financialYear}/${String(sequenceNumber).padStart(4, "0")}`,
  };
}

/* ================================ invoicing =============================== */

export const raiseSalesInvoice: CommandDefinition<
  { salesOrderId: string; seriesKey?: string },
  { id: string; invoiceNumber: string; totalPaise: number; interState: boolean }
> = {
  key: "verity.plywood.raise_sales_invoice",
  entity: ENTITY_INVOICE,
  verb: "Create",
  input: z.object({
    salesOrderId: z.string().uuid(),
    seriesKey: z.string().min(1).max(20).optional(),
  }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodSalesOrder.findUniqueOrThrow({
      where: { id: input.salesOrderId },
      include: { lines: true, customer: true },
    });

    const existing = await ctx.tx.plywoodInvoice.findFirst({
      where: { salesOrderId: order.id },
    });
    if (existing) {
      throw new ValidationError("E_VALIDATION: this order has already been invoiced");
    }
    if (order.state === "draft" || order.state === "cancelled") {
      throw new ValidationError("E_VALIDATION: only an approved order can be invoiced");
    }

    const supplyStateCode = String(
      (await resolveConfig<unknown>(ctx.tx, CONFIG_TENANT_STATE_CODE)) ?? "",
    ).trim();
    if (!supplyStateCode) {
      throw new ValidationError(
        "E_VALIDATION: this business has no state code configured, so tax cannot be decided",
      );
    }
    // Snapshotted onto the invoice: a customer who later moves state must not
    // retrospectively change how an old invoice was taxed.
    const placeOfSupplyStateCode = order.customer.stateCode ?? supplyStateCode;

    const [rawCgst, rawSgst, rawIgst] = await Promise.all([
      resolveConfig<unknown>(ctx.tx, CONFIG_CGST_RATE_BP),
      resolveConfig<unknown>(ctx.tx, CONFIG_SGST_RATE_BP),
      resolveConfig<unknown>(ctx.tx, CONFIG_IGST_RATE_BP),
    ]);
    const cgstRateBp = configNumber(rawCgst, CONFIG_CGST_RATE_BP);
    const sgstRateBp = configNumber(rawSgst, CONFIG_SGST_RATE_BP);
    const igstRateBp = configNumber(rawIgst, CONFIG_IGST_RATE_BP);

    const taxablePaise = order.lines.reduce(
      (sum, line) => sum + line.qtyOrdered * line.unitPricePaise,
      0,
    );
    const tax = computeInvoiceTax({
      taxablePaise,
      supplyStateCode,
      placeOfSupplyStateCode,
      cgstRateBp: cgstRateBp ?? 0,
      sgstRateBp: sgstRateBp ?? 0,
      igstRateBp: igstRateBp ?? 0,
    });

    const issuedAt = new Date();
    const financialYear = financialYearOf(issuedAt);
    const numbering = await nextInvoiceNumber(
      ctx.tx,
      ctx.actor.tenantId,
      input.seriesKey ?? "SALES",
      financialYear,
    );

    const invoice = await ctx.tx.plywoodInvoice.create({
      data: {
        tenantId: ctx.actor.tenantId,
        seriesId: numbering.seriesId,
        customerId: order.customerId,
        salesOrderId: order.id,
        invoiceNumber: numbering.invoiceNumber,
        sequenceNumber: numbering.sequenceNumber,
        financialYear,
        supplyStateCode,
        placeOfSupplyStateCode,
        cgstRateBp: tax.interState ? 0 : (cgstRateBp ?? 0),
        sgstRateBp: tax.interState ? 0 : (sgstRateBp ?? 0),
        igstRateBp: tax.interState ? (igstRateBp ?? 0) : 0,
        taxablePaise,
        cgstPaise: tax.cgstPaise,
        sgstPaise: tax.sgstPaise,
        igstPaise: tax.igstPaise,
        totalPaise: tax.totalPaise,
        issuedAt,
      },
    });

    await ctx.tx.plywoodInvoiceLine.createMany({
      data: order.lines.map((line) => ({
        tenantId: ctx.actor.tenantId,
        invoiceId: invoice.id,
        productId: line.productId,
        productNameSnapshot: line.productNameSnapshot,
        hsnCodeSnapshot: line.hsnCodeSnapshot,
        qtyUnits: line.qtyOrdered,
        unitPricePaise: line.unitPricePaise,
        lineTotalPaise: line.qtyOrdered * line.unitPricePaise,
      })),
    });

    // The customer now owes the invoice total. A debit from this business's
    // point of view, consistently — a ledger that flips perspective between
    // customers and suppliers is unreadable.
    await ctx.tx.plywoodLedgerEntry.create({
      data: {
        tenantId: ctx.actor.tenantId,
        customerId: order.customerId,
        entryType: "debit",
        amountPaise: tax.totalPaise,
        invoiceId: invoice.id,
        narration: `Invoice ${numbering.invoiceNumber}`,
      },
    });

    return {
      result: {
        id: invoice.id,
        invoiceNumber: numbering.invoiceNumber,
        totalPaise: tax.totalPaise,
        interState: tax.interState,
      },
      events: [{ name: "verity.plywood.sales_invoice_raised", entityId: invoice.id }],
    };
  },
};

export const raisePurchaseInvoice: CommandDefinition<
  { purchaseOrderId: string; supplierInvoiceTotalPaise: number; seriesKey?: string },
  { id: string; invoiceNumber: string }
> = {
  key: "verity.plywood.raise_purchase_invoice",
  entity: ENTITY_INVOICE,
  verb: "Create",
  input: z.object({
    purchaseOrderId: z.string().uuid(),
    // The supplier's own figure. Recorded as given rather than recomputed: what
    // this business owes is what the supplier billed, and a mismatch with the
    // order is a conversation, not a silent correction.
    supplierInvoiceTotalPaise: z.number().int().min(0),
    seriesKey: z.string().min(1).max(20).optional(),
  }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodPurchaseOrder.findUniqueOrThrow({
      where: { id: input.purchaseOrderId },
      include: { lines: true, supplier: true },
    });
    const existing = await ctx.tx.plywoodInvoice.findFirst({
      where: { purchaseOrderId: order.id },
    });
    if (existing) {
      throw new ValidationError("E_VALIDATION: this purchase order has already been invoiced");
    }

    const supplyStateCode =
      order.supplier.stateCode ??
      (await resolveConfig<string>(ctx.tx, CONFIG_TENANT_STATE_CODE)) ??
      "00";
    const placeOfSupplyStateCode =
      (await resolveConfig<string>(ctx.tx, CONFIG_TENANT_STATE_CODE)) ?? "00";

    const issuedAt = new Date();
    const financialYear = financialYearOf(issuedAt);
    const numbering = await nextInvoiceNumber(
      ctx.tx,
      ctx.actor.tenantId,
      input.seriesKey ?? "PURCHASE",
      financialYear,
    );

    // A purchase invoice records what was billed; the tax split is the
    // supplier's, not this business's to compute. Taxable equals total with no
    // tax lines rather than a guessed breakdown that would be wrong on a filing.
    const invoice = await ctx.tx.plywoodInvoice.create({
      data: {
        tenantId: ctx.actor.tenantId,
        seriesId: numbering.seriesId,
        supplierId: order.supplierId,
        purchaseOrderId: order.id,
        invoiceNumber: numbering.invoiceNumber,
        sequenceNumber: numbering.sequenceNumber,
        financialYear,
        supplyStateCode,
        placeOfSupplyStateCode,
        taxablePaise: input.supplierInvoiceTotalPaise,
        totalPaise: input.supplierInvoiceTotalPaise,
        issuedAt,
      },
    });

    // This business now owes the supplier. Credit, from the same point of view.
    await ctx.tx.plywoodLedgerEntry.create({
      data: {
        tenantId: ctx.actor.tenantId,
        supplierId: order.supplierId,
        entryType: "credit",
        amountPaise: input.supplierInvoiceTotalPaise,
        invoiceId: invoice.id,
        narration: `Purchase invoice ${numbering.invoiceNumber}`,
      },
    });

    return {
      result: { id: invoice.id, invoiceNumber: numbering.invoiceNumber },
      events: [{ name: "verity.plywood.purchase_invoice_raised", entityId: invoice.id }],
    };
  },
};

export const recordPayment: CommandDefinition<
  {
    invoiceId: string;
    amountPaise: number;
    method: "cash" | "bank" | "upi" | "cheque";
    reference?: string;
  },
  { id: string; outstandingPaise: number }
> = {
  key: "verity.plywood.record_payment",
  entity: ENTITY_PAYMENT,
  verb: "Create",
  input: z.object({
    invoiceId: z.string().uuid(),
    amountPaise: z.number().int().positive(),
    method: z.enum(["cash", "bank", "upi", "cheque"]),
    reference: z.string().max(120).optional(),
  }),
  handler: async (ctx, input) => {
    const invoice = await ctx.tx.plywoodInvoice.findUniqueOrThrow({
      where: { id: input.invoiceId },
      include: { payments: true },
    });

    const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
    const outstandingBefore = invoice.totalPaise - paid;
    if (input.amountPaise > outstandingBefore) {
      // Refused rather than accepted as an overpayment. An overpayment is a real
      // event with its own treatment — an advance, or a refund — and quietly
      // absorbing it here would leave money the ledger cannot explain.
      throw new ValidationError(
        `E_VALIDATION: ${outstandingBefore} paise outstanding on this invoice, cannot receive more`,
      );
    }

    const payment = await ctx.tx.plywoodPayment.create({
      data: {
        tenantId: ctx.actor.tenantId,
        invoiceId: invoice.id,
        method: input.method,
        amountPaise: input.amountPaise,
        reference: input.reference ?? null,
        byUserId: ctx.actor.userId,
      },
    });

    // The mirror of the invoice entry, so the two sum to what is still owed.
    await ctx.tx.plywoodLedgerEntry.create({
      data: {
        tenantId: ctx.actor.tenantId,
        customerId: invoice.customerId,
        supplierId: invoice.supplierId,
        entryType: invoice.customerId ? "credit" : "debit",
        amountPaise: input.amountPaise,
        invoiceId: invoice.id,
        paymentId: payment.id,
        narration: `Payment against ${invoice.invoiceNumber}`,
      },
    });

    return {
      result: { id: payment.id, outstandingPaise: outstandingBefore - input.amountPaise },
      events: [{ name: "verity.plywood.payment_recorded", entityId: payment.id }],
    };
  },
};

/* ================================= reads ================================== */

/**
 * What a party owes, derived (P3).
 *
 * `SUM(debit) - SUM(credit)` over the append-only ledger. Positive means the
 * customer owes this business; for a supplier the sign is reversed by the entry
 * types, so a positive figure always means "owed to us" and a negative one
 * "owed by us".
 */
export async function partyBalancePaise(
  tx: TenantScopedClient,
  party: { customerId?: string; supplierId?: string },
): Promise<number> {
  const rows = await tx.$queryRaw<{ balance: bigint | null }[]>`
    SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount_paise ELSE -amount_paise END), 0)::bigint AS balance
      FROM plywood_ledger_entry
     WHERE (${party.customerId ?? null}::uuid IS NULL OR customer_id = ${party.customerId ?? null}::uuid)
       AND (${party.supplierId ?? null}::uuid IS NULL OR supplier_id = ${party.supplierId ?? null}::uuid)
       AND (${party.customerId ?? null}::uuid IS NOT NULL OR customer_id IS NULL)
       AND (${party.supplierId ?? null}::uuid IS NOT NULL OR supplier_id IS NULL)`;
  return Number(rows[0]?.balance ?? 0);
}

export const outstandingReceivables: QueryDefinition<
  Record<string, never>,
  Array<{
    customerId: string;
    customerName: string;
    invoicedPaise: number;
    receivedPaise: number;
    outstandingPaise: number;
    oldestUnpaidAt: Date | null;
  }>
> = {
  key: "verity.plywood.outstanding_receivables",
  entity: ENTITY_LEDGER_ENTRY,
  input: z.object({}),
  handler: async (ctx) => {
    const invoices = await ctx.tx.plywoodInvoice.findMany({
      where: { customerId: { not: null } },
      include: { customer: { select: { displayName: true } }, payments: true },
    });

    const byCustomer = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        invoicedPaise: number;
        receivedPaise: number;
        outstandingPaise: number;
        oldestUnpaidAt: Date | null;
      }
    >();

    for (const invoice of invoices) {
      const customerId = invoice.customerId!;
      const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
      const outstanding = invoice.totalPaise - paid;
      const row = byCustomer.get(customerId) ?? {
        customerId,
        customerName: invoice.customer!.displayName,
        invoicedPaise: 0,
        receivedPaise: 0,
        outstandingPaise: 0,
        oldestUnpaidAt: null,
      };
      row.invoicedPaise += invoice.totalPaise;
      row.receivedPaise += paid;
      row.outstandingPaise += outstanding;
      // The age of the oldest unpaid invoice is what a collections call is
      // about, so it is carried rather than left to be derived from a list.
      if (outstanding > 0 && (!row.oldestUnpaidAt || invoice.issuedAt < row.oldestUnpaidAt)) {
        row.oldestUnpaidAt = invoice.issuedAt;
      }
      byCustomer.set(customerId, row);
    }

    return [...byCustomer.values()]
      .filter((row) => row.outstandingPaise !== 0)
      .sort((a, b) => b.outstandingPaise - a.outstandingPaise);
  },
};

export const partyLedger: QueryDefinition<
  { customerId?: string; supplierId?: string },
  {
    balancePaise: number;
    entries: Array<{
      id: string;
      entryType: string;
      amountPaise: number;
      narration: string | null;
      occurredAt: Date;
      runningBalancePaise: number;
    }>;
  }
> = {
  key: "verity.plywood.party_ledger",
  entity: ENTITY_LEDGER_ENTRY,
  input: z.object({
    customerId: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
  }),
  handler: async (ctx, input) => {
    if (Boolean(input.customerId) === Boolean(input.supplierId)) {
      throw new ValidationError("E_VALIDATION: name exactly one party");
    }

    const entries = await ctx.tx.plywoodLedgerEntry.findMany({
      where: input.customerId
        ? { customerId: input.customerId }
        : { supplierId: input.supplierId },
      orderBy: { occurredAt: "asc" },
    });

    // The running balance is computed for DISPLAY and never stored (P3). A
    // stored one would be a second source of truth that can disagree with the
    // entries it summarises.
    let running = 0;
    const rows = entries.map((entry) => {
      running += entry.entryType === "debit" ? entry.amountPaise : -entry.amountPaise;
      return {
        id: entry.id,
        entryType: entry.entryType,
        amountPaise: entry.amountPaise,
        narration: entry.narration,
        occurredAt: entry.occurredAt,
        runningBalancePaise: running,
      };
    });

    return { balancePaise: running, entries: rows };
  },
};

export const invoiceDetail: QueryDefinition<
  { invoiceId: string },
  {
    id: string;
    invoiceNumber: string;
    direction: "sales" | "purchase";
    partyName: string;
    /// Legally required on a tax invoice alongside the supplier's own.
    partyGstin: string | null;
    issuedAt: Date;
    interState: boolean;
    supplyStateCode: string;
    placeOfSupplyStateCode: string;
    /// Basis points, as they were when the invoice was raised. A rate change
    /// next quarter must not restate a filed document, so these are read from
    /// the invoice rather than from configuration.
    cgstRateBp: number;
    sgstRateBp: number;
    igstRateBp: number;
    taxablePaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    totalPaise: number;
    paidPaise: number;
    outstandingPaise: number;
    payments: Array<{
      method: string;
      amountPaise: number;
      reference: string | null;
      receivedAt: Date;
    }>;
    lines: Array<{
      name: string;
      hsnCode: string;
      qtyUnits: number;
      unitPricePaise: number;
      lineTotalPaise: number;
    }>;
  } | null
> = {
  key: "verity.plywood.invoice_detail",
  entity: ENTITY_INVOICE,
  input: z.object({ invoiceId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const invoice = await ctx.tx.plywoodInvoice.findUnique({
      where: { id: input.invoiceId },
      include: {
        lines: true,
        payments: true,
        customer: { select: { displayName: true, gstin: true } },
        supplier: { select: { displayName: true, gstin: true } },
      },
    });
    if (!invoice) return null;

    const paidPaise = invoice.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      direction: invoice.customerId ? ("sales" as const) : ("purchase" as const),
      partyName: invoice.customer?.displayName ?? invoice.supplier?.displayName ?? "—",
      partyGstin: invoice.customer?.gstin ?? invoice.supplier?.gstin ?? null,
      issuedAt: invoice.issuedAt,
      interState: invoice.igstPaise > 0,
      supplyStateCode: invoice.supplyStateCode,
      placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
      cgstRateBp: invoice.cgstRateBp,
      sgstRateBp: invoice.sgstRateBp,
      igstRateBp: invoice.igstRateBp,
      payments: invoice.payments
        .slice()
        .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
        .map((payment) => ({
          method: payment.method,
          amountPaise: payment.amountPaise,
          reference: payment.reference,
          receivedAt: payment.receivedAt,
        })),
      taxablePaise: invoice.taxablePaise,
      cgstPaise: invoice.cgstPaise,
      sgstPaise: invoice.sgstPaise,
      igstPaise: invoice.igstPaise,
      totalPaise: invoice.totalPaise,
      paidPaise,
      outstandingPaise: invoice.totalPaise - paidPaise,
      lines: invoice.lines.map((line) => ({
        name: line.productNameSnapshot,
        hsnCode: line.hsnCodeSnapshot,
        qtyUnits: line.qtyUnits,
        unitPricePaise: line.unitPricePaise,
        lineTotalPaise: line.lineTotalPaise,
      })),
    };
  },
};

export const listInvoices: QueryDefinition<
  { unpaidOnly?: boolean },
  Array<{
    id: string;
    invoiceNumber: string;
    partyName: string;
    direction: "sales" | "purchase";
    issuedAt: Date;
    totalPaise: number;
    outstandingPaise: number;
  }>
> = {
  key: "verity.plywood.list_invoices",
  entity: ENTITY_INVOICE,
  input: z.object({ unpaidOnly: z.boolean().optional() }),
  handler: async (ctx, input) => {
    const invoices = await ctx.tx.plywoodInvoice.findMany({
      include: {
        payments: true,
        customer: { select: { displayName: true } },
        supplier: { select: { displayName: true } },
      },
      orderBy: { issuedAt: "desc" },
      take: 200,
    });

    return invoices
      .map((invoice) => {
        const paid = invoice.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          partyName: invoice.customer?.displayName ?? invoice.supplier?.displayName ?? "—",
          direction: invoice.customerId ? ("sales" as const) : ("purchase" as const),
          issuedAt: invoice.issuedAt,
          totalPaise: invoice.totalPaise,
          outstandingPaise: invoice.totalPaise - paid,
        };
      })
      .filter((row) => !input.unpaidOnly || row.outstandingPaise > 0);
  },
};

/* =============================== the console ============================== */

/**
 * PLYWOOD STAGE 7 — the owner console.
 *
 * plywood.md §8.1 names the eight figures, so this returns exactly those eight
 * and nothing invented alongside them. One query rather than eight, because a
 * dashboard that fans out into eight round trips is a dashboard that is slow at
 * precisely the moment somebody opens it to check on the business.
 *
 * Every figure is the sum of records that already exist. Nothing here is typed
 * in, and nothing is estimated.
 */
export const ownerConsole: QueryDefinition<
  Record<string, never>,
  {
    todaysSalesPaise: number;
    todaysPurchasesPaise: number;
    stockValuePaise: number;
    receivablesPaise: number;
    payablesPaise: number;
    pendingDeliveries: number;
    inTransitShipments: number;
    lowStockBoards: number;
  }
> = {
  key: "verity.plywood.owner_console",
  entity: ENTITY_INVOICE,
  input: z.object({}),
  handler: async (ctx) => {
    const rows = await ctx.tx.$queryRaw<
      Record<string, bigint | null>[]
    >`SELECT
        (SELECT COALESCE(SUM(total_paise), 0) FROM plywood_invoice
          WHERE customer_id IS NOT NULL AND issued_at >= date_trunc('day', now()))::bigint
          AS todays_sales,
        (SELECT COALESCE(SUM(total_paise), 0) FROM plywood_invoice
          WHERE supplier_id IS NOT NULL AND issued_at >= date_trunc('day', now()))::bigint
          AS todays_purchases,
        (SELECT COALESCE(SUM(qty_units * avg_unit_cost_paise), 0) FROM stock_balance)::bigint
          AS stock_value,
        (SELECT COALESCE(SUM(i.total_paise), 0) - COALESCE((
           SELECT SUM(p.amount_paise) FROM plywood_payment p
            JOIN plywood_invoice pi ON pi.id = p.invoice_id
           WHERE pi.customer_id IS NOT NULL), 0)
           FROM plywood_invoice i WHERE i.customer_id IS NOT NULL)::bigint
          AS receivables,
        (SELECT COALESCE(SUM(i.total_paise), 0) - COALESCE((
           SELECT SUM(p.amount_paise) FROM plywood_payment p
            JOIN plywood_invoice pi ON pi.id = p.invoice_id
           WHERE pi.supplier_id IS NOT NULL), 0)
           FROM plywood_invoice i WHERE i.supplier_id IS NOT NULL)::bigint
          AS payables,
        (SELECT count(*) FROM plywood_sales_order
          WHERE state IN ('approved', 'dispatching'))::bigint
          AS pending_deliveries,
        (SELECT count(*) FROM plywood_shipment WHERE state = 'in_transit')::bigint
          AS in_transit,
        (SELECT count(*) FROM plywood_product p
          WHERE p.active AND p.reorder_level_units > 0
            AND COALESCE((SELECT SUM(b.qty_units) FROM stock_balance b
                           WHERE b.product_id = p.id), 0) <= p.reorder_level_units)::bigint
          AS low_stock`;

    const row = rows[0] ?? {};
    const n = (key: string) => Number(row[key] ?? 0);
    return {
      todaysSalesPaise: n("todays_sales"),
      todaysPurchasesPaise: n("todays_purchases"),
      stockValuePaise: n("stock_value"),
      receivablesPaise: n("receivables"),
      payablesPaise: n("payables"),
      pendingDeliveries: n("pending_deliveries"),
      inTransitShipments: n("in_transit"),
      lowStockBoards: n("low_stock"),
    };
  },
};

/**
 * Margin, and the honest name of the method that produced it (P1).
 *
 * Revenue is the taxable value of sales invoices — tax collected is not income.
 * Cost is what the stock ledger recorded as consumed at the moment each sale
 * happened, which is why an outward movement stores its cost rather than being
 * revalued later.
 */
export const marginReport: QueryDefinition<
  { sinceDays?: number },
  {
    costingMethod: string;
    revenuePaise: number;
    costOfGoodsSoldPaise: number;
    marginPaise: number;
    marginBp: number;
  }
> = {
  key: "verity.plywood.margin_report",
  entity: ENTITY_INVOICE,
  input: z.object({ sinceDays: z.number().int().min(1).max(3650).optional() }),
  handler: async (ctx, input) => {
    const since = new Date(Date.now() - (input.sinceDays ?? 30) * 86_400_000);

    const [revenueRows, costRows] = await Promise.all([
      ctx.tx.$queryRaw<{ revenue: bigint | null }[]>`
        SELECT COALESCE(SUM(taxable_paise), 0)::bigint AS revenue
          FROM plywood_invoice
         WHERE customer_id IS NOT NULL AND issued_at >= ${since}`,
      ctx.tx.$queryRaw<{ cost: bigint | null }[]>`
        SELECT COALESCE(SUM(-qty_delta_units * unit_cost_paise), 0)::bigint AS cost
          FROM stock_ledger_entry
         WHERE kind = 'sales_outward' AND occurred_at >= ${since}`,
    ]);

    const revenuePaise = Number(revenueRows[0]?.revenue ?? 0);
    const costOfGoodsSoldPaise = Number(costRows[0]?.cost ?? 0);
    const marginPaise = revenuePaise - costOfGoodsSoldPaise;

    return {
      // Named, not implied. An owner reading a margin is entitled to know which
      // of three possible numbers it is; FIFO and last-purchase-cost would both
      // give a different one.
      costingMethod: "Weighted average cost",
      revenuePaise,
      costOfGoodsSoldPaise,
      marginPaise,
      marginBp: revenuePaise === 0 ? 0 : Math.round((marginPaise / revenuePaise) * 10_000),
    };
  },
};
