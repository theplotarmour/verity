import { z } from "zod";

/**
 * A uuid no godown will ever have, so `location_id = ANY(...)` on an empty
 * reachable set matches nothing rather than being rendered as an empty array
 * some driver might treat as unconstrained. Empty means NOTHING here, always.
 */
const NO_GODOWN = "00000000-0000-0000-0000-000000000000";
import { sellerIdentity } from "./business";
import { resolveTaxRate } from "./tax";
import { assertPeriodOpen } from "./period";
import { reachableGodownIds } from "./scope";
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
  ENTITY_PURCHASE_ORDER,
  ENTITY_STOCK_BALANCE,
} from "./keys";

/**
 * The order states a financial document may be raised against.
 *
 * Authority: taskplans/45_plywood_workflow_program.md §5 (state machines) and
 * PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-03.
 *
 * Allow-lists, not deny-lists. When the Goods Issue and Goods Receipt
 * documents arrive, these sets tighten further — an invoice will be limited to
 * the quantity actually issued or received, rather than the quantity ordered —
 * and the sets are where that change belongs.
 */
const INVOICEABLE_SALES_ORDER_STATES = new Set([
  "approved",
  "dispatching",
  "completed",
]);

const INVOICEABLE_PURCHASE_ORDER_STATES = new Set([
  "submitted",
  // The implementation's name for Part Received. The rule freeze's state
  // machine (§5) calls it "Part Received"; renaming the stored value is a
  // migration on live orders and belongs to the slice that unifies the
  // vocabulary, not to a guard that would silently stop matching if it
  // guessed the new name early.
  "receiving",
  "completed",
]);

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
export async function nextDocumentNumber(
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

/**
 * Kept under its old name for the invoicing path, which is the only caller
 * that needs the series id back.
 *
 * The allocator itself is shared with Goods Receipt numbering (slice 3): a
 * receipt is a document a supplier dispute turns on, so it is numbered
 * gaplessly for the same reason an invoice is, and two implementations of
 * "allocate the next number" is how one of them ends up with gaps.
 */
const nextInvoiceNumber = nextDocumentNumber;

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
    // Audit P0-03. The previous guard rejected only `draft` and `cancelled`,
    // which let an order sitting in `pending_credit` be invoiced — a financial
    // document raised against credit the business had explicitly refused to
    // grant. Stated as an allow-list rather than a deny-list: a state added
    // later is then refused until somebody decides it should be invoiceable,
    // which is the safe direction to be wrong in.
    if (!INVOICEABLE_SALES_ORDER_STATES.has(order.state)) {
      throw new ValidationError(
        `E_VALIDATION: a sales order in ${order.state} cannot be invoiced; ` +
          "credit must be approved first",
      );
    }

    // Checked AFTER the state guard: an order awaiting credit approval has
    // also issued nothing, and "approve the credit" is the useful thing to
    // tell someone. The more specific refusal goes first.
    // Nothing has left the yard: there is nothing to bill for. Slice 4
    // completes P0-03 — the invoice follows the Goods Issue, not the order.
    const issuedTotal = order.lines.reduce((sum, line) => sum + line.qtyShipped, 0);
    if (issuedTotal === 0) {
      throw new ValidationError(
        "E_VALIDATION: nothing has been issued against this order, so there is " +
          "nothing to invoice. Issue the goods first.",
      );
    }


    // The seller's identity comes from the GST registration (P0-09), not from
    // a configuration key. The key remains as a transitional fallback for
    // tenants provisioned before slice 2; it is removed when the effective-dated
    // tax rules land in slice 6, and until then a deployment that has completed
    // onboarding never reads it.
    const seller = await sellerIdentity(ctx.tx);
    const supplyStateCode =
      seller.stateCode ??
      String((await resolveConfig<unknown>(ctx.tx, CONFIG_TENANT_STATE_CODE)) ?? "").trim();
    if (!supplyStateCode) {
      throw new ValidationError(
        "E_VALIDATION: this business has no GST registration, so tax cannot be decided. " +
          "Add one under Business Settings.",
      );
    }

    // A missing customer state must NOT fall back to the business's own
    // (rule freeze §4.4). Doing so silently labels an interstate supply as
    // intrastate, which charges the wrong tax and files the wrong return —
    // and it fails in the direction that looks correct on screen.
    if (!order.customer.stateCode) {
      throw new ValidationError(
        `E_VALIDATION: ${order.customer.displayName} has no state code, so the place of supply ` +
          "cannot be determined and the invoice would be taxed as if it were local",
      );
    }
    // Snapshotted onto the invoice: a customer who later moves state must not
    // retrospectively change how an old invoice was taxed.
    const placeOfSupplyStateCode = order.customer.stateCode;

    // The day of supply. Declared before the rate lookup because the rate is
    // resolved AS AT this instant — the whole point of an effective-dated rule.
    const issuedAt = new Date();

    // Slice 7 (P0-08): nothing is posted into a period that has been reported.
    await assertPeriodOpen(ctx.tx, issuedAt);

    // THE RATE COMES FROM AN EFFECTIVE-DATED RULE (slice 6, P0-07).
    //
    // Resolved for the HSN on the line, under this registration, on the day of
    // supply. The three global configuration keys remain as a fallback for a
    // tenant that has not yet set any rules, and only as that: a business that
    // has completed tax setup never reads them, and the fallback is removed
    // when the last such tenant is migrated.
    //
    // ONE RATE PER INVOICE, DELIBERATELY
    // The invoice model carries one set of rates. A mixed-rate invoice — 18%
    // boards and 12% hardware on one document — needs line-level tax, which is
    // a schema change and its own task. Until then an invoice whose lines
    // resolve to DIFFERENT rates is refused rather than silently taxed at the
    // first one, because the second behaviour is wrong in a way nobody sees.
    let cgstRateBp: number | undefined;
    let sgstRateBp: number | undefined;
    let igstRateBp: number | undefined;

    const registration = await ctx.tx.plywoodGstRegistration.findFirst({ where: { active: true } });
    if (registration) {
      const rates = new Set<string>();
      for (const line of order.lines) {
        const rate = await resolveTaxRate(ctx.tx, {
          registrationId: registration.id,
          hsnCode: line.hsnCodeSnapshot,
          on: issuedAt,
        });
        rates.add(`${rate.cgstRateBp}:${rate.sgstRateBp}`);
        cgstRateBp = rate.cgstRateBp;
        sgstRateBp = rate.sgstRateBp;
        // Interstate is the two halves expressed once, so it is derived rather
        // than stored twice and cannot drift from them.
        igstRateBp = rate.cgstRateBp + rate.sgstRateBp;
      }
      if (rates.size > 1) {
        throw new ValidationError(
          "E_VALIDATION: this order's lines attract different tax rates, and an invoice " +
            "carries one rate. Split it into one order per rate.",
        );
      }
    } else {
      const [rawCgst, rawSgst, rawIgst] = await Promise.all([
        resolveConfig<unknown>(ctx.tx, CONFIG_CGST_RATE_BP),
        resolveConfig<unknown>(ctx.tx, CONFIG_SGST_RATE_BP),
        resolveConfig<unknown>(ctx.tx, CONFIG_IGST_RATE_BP),
      ]);
      cgstRateBp = configNumber(rawCgst, CONFIG_CGST_RATE_BP);
      sgstRateBp = configNumber(rawSgst, CONFIG_SGST_RATE_BP);
      igstRateBp = configNumber(rawIgst, CONFIG_IGST_RATE_BP);
    }

    const taxablePaise = order.lines.reduce(
      // ISSUED, not ordered (audit P0-03, slice 4). Invoicing the ordered
      // quantity bills a customer for boards still sitting in the godown —
      // and on a partial issue it bills them for goods they have not been
      // given, which is the version of this defect that reaches a customer.
      (sum, line) => sum + line.qtyShipped * line.unitPricePaise,
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
        // The seller's own identity, frozen with the document (P0-09). A
        // business that renames itself or re-registers must not restate an
        // invoice it has already given to a customer and reported.
        sellerLegalNameSnapshot: seller.legalName,
        sellerGstinSnapshot: seller.gstin,
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
        qtyUnits: line.qtyShipped,
        unitPricePaise: line.unitPricePaise,
        lineTotalPaise: line.qtyShipped * line.unitPricePaise,
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

/**
 * Records the supplier's invoice against a purchase order.
 *
 * THE DEFECT THIS CLOSES (specification 30, 62). A purchase invoice used to
 * be stored with `taxablePaise = totalPaise` and every tax column at zero, on
 * the reasoning that the split is the supplier's and not ours to compute. The
 * reasoning is right and the conclusion was wrong: the consequence was that
 * **input credit was structurally always nil**. `taxSummary` read those zeros,
 * so eligible ITC came out at zero whatever the business had actually been
 * charged, every purchase invoice raised a `no_input_credit` exception, and
 * the net GST estimate overstated what was payable by the entire input side.
 * A business filing from that number pays its tax twice.
 *
 * So the split is RECORDED, not computed. These are the supplier's figures,
 * transcribed from their document. What is validated is only that the parts
 * add up to the total and that IGST does not appear alongside CGST/SGST —
 * both are transcription errors, and both belong on the exceptions list
 * rather than in a return.
 */
export const raisePurchaseInvoice: CommandDefinition<
  {
    purchaseOrderId: string;
    supplierInvoiceTotalPaise: number;
    /** The supplier's tax split, transcribed rather than computed. */
    taxablePaise?: number;
    cgstPaise?: number;
    sgstPaise?: number;
    igstPaise?: number;
    /** The supplier's own invoice number, for matching against GST records. */
    supplierInvoiceNumber?: string;
    seriesKey?: string;
  },
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
    taxablePaise: z.number().int().min(0).optional(),
    cgstPaise: z.number().int().min(0).optional(),
    sgstPaise: z.number().int().min(0).optional(),
    igstPaise: z.number().int().min(0).optional(),
    supplierInvoiceNumber: z.string().max(60).optional(),
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

    // Audit P0-03, the purchasing half: there was no state guard at all, so a
    // supplier invoice could be recorded against a draft or cancelled purchase
    // order — a payable for goods nobody had ordered.
    if (!INVOICEABLE_PURCHASE_ORDER_STATES.has(order.state)) {
      throw new ValidationError(
        `E_VALIDATION: a purchase order in ${order.state} cannot be invoiced; ` +
          "it must be submitted first",
      );
    }

    // Slice 3 tightens P0-03 on the purchasing side: an invoice is a claim for
    // goods, so there must be goods. A supplier invoice arriving before the
    // lorry is a real situation and a real problem — recording it as a payable
    // against nothing received is how a business pays for a delivery it never
    // got. A quantity or price DIFFERENCE is not refused here; that is a
    // conversation, and `purchaseMatch` names it.
    const receiptCount = await ctx.tx.plywoodGoodsReceipt.count({
      where: { purchaseOrderId: order.id },
    });
    if (receiptCount === 0) {
      throw new ValidationError(
        "E_VALIDATION: nothing has been received against this purchase order, " +
          "so there is nothing to invoice. Record the goods receipt first.",
      );
    }

    const supplyStateCode =
      order.supplier.stateCode ??
      (await resolveConfig<string>(ctx.tx, CONFIG_TENANT_STATE_CODE)) ??
      "00";
    const placeOfSupplyStateCode =
      (await resolveConfig<string>(ctx.tx, CONFIG_TENANT_STATE_CODE)) ?? "00";

    const issuedAt = new Date();
    await assertPeriodOpen(ctx.tx, issuedAt);
    const financialYear = financialYearOf(issuedAt);
    const numbering = await nextInvoiceNumber(
      ctx.tx,
      ctx.actor.tenantId,
      input.seriesKey ?? "PURCHASE",
      financialYear,
    );

    // A purchase invoice records what was billed. The split is the supplier's,
    // transcribed rather than computed — but it is RECORDED, because a tax
    // column left at zero is not "unknown", it is a claim that no tax was
    // charged, and the input-credit side of every return reads it as one.
    const cgstPaise = input.cgstPaise ?? 0;
    const sgstPaise = input.sgstPaise ?? 0;
    const igstPaise = input.igstPaise ?? 0;
    const taxPaise = cgstPaise + sgstPaise + igstPaise;
    // Defaulted rather than required, so an invoice can still be recorded from
    // a document whose split has not been read off yet. That case now surfaces
    // as an exception instead of silently costing the business its credit.
    const taxablePaise = input.taxablePaise ?? input.supplierInvoiceTotalPaise - taxPaise;

    if (taxablePaise < 0) {
      throw new ValidationError(
        "E_VALIDATION: the tax on this invoice exceeds its total; check the figures",
      );
    }
    if (taxablePaise + taxPaise !== input.supplierInvoiceTotalPaise) {
      throw new ValidationError(
        `E_VALIDATION: taxable ${taxablePaise} plus tax ${taxPaise} does not equal ` +
          `the invoice total ${input.supplierInvoiceTotalPaise}`,
      );
    }
    // Intra-state carries CGST and SGST; inter-state carries IGST. Both at once
    // is not a rate question, it is a transcription error, and it must not
    // reach a return.
    if (igstPaise > 0 && (cgstPaise > 0 || sgstPaise > 0)) {
      throw new ValidationError(
        "E_VALIDATION: an invoice carries either IGST or CGST+SGST, never both",
      );
    }

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
        taxablePaise,
        cgstPaise,
        sgstPaise,
        igstPaise,
        totalPaise: input.supplierInvoiceTotalPaise,
        issuedAt,
        // The supplier's own number, kept in custom fields rather than as a
        // column: it identifies THEIR document, and this table's
        // `invoiceNumber` is ours. Conflating the two would break our own
        // sequence guarantee.
        ...(input.supplierInvoiceNumber
          ? { customFields: { supplierInvoiceNumber: input.supplierInvoiceNumber } }
          : {}),
      },
    });

    // Lines, so the purchase register has an HSN summary to file from (§60).
    // Quantities are what was RECEIVED, not what was ordered: the invoice is
    // for goods that arrived, and §29 wants an ordered-versus-received
    // difference shown rather than hidden inside a line.
    const receivedLines = order.lines.filter((line) => line.qtyReceived > 0);
    if (receivedLines.length > 0) {
      await ctx.tx.plywoodInvoiceLine.createMany({
        data: receivedLines.map((line) => ({
          tenantId: ctx.actor.tenantId,
          invoiceId: invoice.id,
          productId: line.productId,
          productNameSnapshot: line.productNameSnapshot,
          hsnCodeSnapshot: line.hsnCodeSnapshot,
          qtyUnits: line.qtyReceived,
          unitPricePaise: line.unitCostPaise,
          lineTotalPaise: line.qtyReceived * line.unitCostPaise,
        })),
      });
    }

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
    /// Carried so the document can link back to the records that produced it
    /// (§70, §71). Without these the invoice is a dead end: the reader has the
    /// figure and no way to reach the order or the party behind it.
    customerId: string | null;
    supplierId: string | null;
    salesOrderId: string | null;
    purchaseOrderId: string | null;
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
      customerId: invoice.customerId,
      supplierId: invoice.supplierId,
      salesOrderId: invoice.salesOrderId,
      purchaseOrderId: invoice.purchaseOrderId,
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
    /* Sales (§7) */
    salesThisMonthPaise: number;
    todaysSalesPaise: number;
    openSalesOrders: number;
    awaitingCreditApproval: number;
    awaitingGoodsIssue: number;
    /* Purchase */
    openPurchaseOrders: number;
    pendingReceipt: number;
    incomingUnits: number;
    todaysPurchasesPaise: number;
    /* Inventory */
    stockValuePaise: number;
    lowStockBoards: number;
    reservedUnits: number;
    /* Money */
    receivablesPaise: number;
    overdueReceivablesPaise: number;
    payablesPaise: number;
    collectionsTodayPaise: number;
    /* Tax */
    outputTaxPaise: number;
    eligibleItcPaise: number;
  }
> = {
  key: "verity.plywood.owner_console",
  entity: ENTITY_INVOICE,
  input: z.object({}),
  handler: async (ctx) => {
    // §7 groups the owner's morning into Sales, Purchase, Inventory, Money and
    // Tax, and every figure it names is here. One statement rather than
    // eighteen: this is the first query of the day on the busiest screen, and
    // eighteen round trips to a pooled connection is eighteen latencies.
    //
    // LAYER 2 ON THE STOCK FIGURES, which was missing.
    // `stock_value`, `low_stock` and `reserved` read the physical inventory,
    // and they read it through no godown filter at all — so a role restricted
    // to one godown saw the whole business's inventory value on its home
    // screen. The order and money figures are deliberately NOT filtered: an
    // invoice is not anchored to a godown, and inventing a filter for it would
    // be a scope rule with no basis in the model. The stock figures are, and
    // now say so.
    const reachable = await reachableGodownIds(ctx.tx, ctx.actor, ENTITY_STOCK_BALANCE);
    // An empty reachable set means nothing, never everything. Prisma renders an
    // empty `IN ()` as false, which is the correct reading, but the array is
    // passed explicitly so the intent survives a future refactor.
    const godowns = reachable.length > 0 ? reachable : [NO_GODOWN];

    const rows = await ctx.tx.$queryRaw<
      Record<string, bigint | null>[]
    >`SELECT
        (SELECT COALESCE(SUM(total_paise), 0) FROM plywood_invoice
          WHERE customer_id IS NOT NULL AND issued_at >= date_trunc('month', now()))::bigint
          AS sales_this_month,
        (SELECT COALESCE(SUM(total_paise), 0) FROM plywood_invoice
          WHERE customer_id IS NOT NULL AND issued_at >= date_trunc('day', now()))::bigint
          AS todays_sales,
        (SELECT COALESCE(SUM(total_paise), 0) FROM plywood_invoice
          WHERE supplier_id IS NOT NULL AND issued_at >= date_trunc('day', now()))::bigint
          AS todays_purchases,
        (SELECT count(*) FROM plywood_sales_order
          WHERE state IN ('draft', 'pending_credit', 'approved', 'dispatching'))::bigint
          AS open_sales_orders,
        (SELECT count(*) FROM plywood_sales_order WHERE state = 'pending_credit')::bigint
          AS awaiting_credit,
        (SELECT count(*) FROM plywood_sales_order
          WHERE state IN ('approved', 'dispatching'))::bigint
          AS awaiting_goods_issue,
        (SELECT count(*) FROM plywood_purchase_order
          WHERE state IN ('submitted', 'receiving'))::bigint
          AS open_purchase_orders,
        -- Orders with something still owed, which is not the same as orders
        -- that are open: a fully received order stays open until it is closed
        -- out, and counting it as "pending receipt" would send someone to the
        -- gate for a lorry that already came.
        (SELECT count(DISTINCT o.id) FROM plywood_purchase_order o
           JOIN plywood_purchase_order_line l ON l.purchase_order_id = o.id
          WHERE o.state IN ('submitted', 'receiving')
            AND l.qty_ordered > l.qty_received)::bigint
          AS pending_receipt,
        (SELECT COALESCE(SUM(GREATEST(l.qty_ordered - l.qty_received, 0)), 0)
           FROM plywood_purchase_order o
           JOIN plywood_purchase_order_line l ON l.purchase_order_id = o.id
          WHERE o.state IN ('submitted', 'receiving'))::bigint
          AS incoming_units,
        (SELECT COALESCE(SUM(qty_units * avg_unit_cost_paise), 0) FROM stock_balance
          WHERE location_id = ANY(${godowns}::uuid[]))::bigint
          AS stock_value,
        (SELECT COALESCE(SUM(r.qty_units), 0) FROM plywood_stock_reservation r
          WHERE r.released_at IS NULL
            AND r.location_id = ANY(${godowns}::uuid[]))::bigint
          AS reserved_units,
        (SELECT COALESCE(SUM(i.total_paise), 0) - COALESCE((
           SELECT SUM(p.amount_paise) FROM plywood_payment p
            JOIN plywood_invoice pi ON pi.id = p.invoice_id
           WHERE pi.customer_id IS NOT NULL), 0)
           FROM plywood_invoice i WHERE i.customer_id IS NOT NULL)::bigint
          AS receivables,
        -- Overdue is age, not a due-date column: this capability records no
        -- payment terms, so "older than 30 days and not settled" is stated as
        -- the rule rather than dressed up as a term the business never agreed.
        (SELECT COALESCE(SUM(i.total_paise - COALESCE((
             SELECT SUM(p.amount_paise) FROM plywood_payment p WHERE p.invoice_id = i.id
           ), 0)), 0)
           FROM plywood_invoice i
          WHERE i.customer_id IS NOT NULL
            AND i.issued_at < now() - interval '30 days'
            AND i.total_paise > COALESCE((
              SELECT SUM(p.amount_paise) FROM plywood_payment p WHERE p.invoice_id = i.id), 0))::bigint
          AS overdue_receivables,
        (SELECT COALESCE(SUM(i.total_paise), 0) - COALESCE((
           SELECT SUM(p.amount_paise) FROM plywood_payment p
            JOIN plywood_invoice pi ON pi.id = p.invoice_id
           WHERE pi.supplier_id IS NOT NULL), 0)
           FROM plywood_invoice i WHERE i.supplier_id IS NOT NULL)::bigint
          AS payables,
        (SELECT COALESCE(SUM(p.amount_paise), 0) FROM plywood_payment p
           JOIN plywood_invoice i ON i.id = p.invoice_id
          WHERE i.customer_id IS NOT NULL
            AND p.received_at >= date_trunc('day', now()))::bigint
          AS collections_today,
        (SELECT COALESCE(SUM(cgst_paise + sgst_paise + igst_paise), 0) FROM plywood_invoice
          WHERE customer_id IS NOT NULL AND issued_at >= date_trunc('month', now()))::bigint
          AS output_tax,
        (SELECT COALESCE(SUM(cgst_paise + sgst_paise + igst_paise), 0) FROM plywood_invoice
          WHERE supplier_id IS NOT NULL AND issued_at >= date_trunc('month', now()))::bigint
          AS eligible_itc,
        -- Available, not on hand (rule freeze §4.2). Counting on-hand reports
        -- plenty while every sheet is already reserved, and the buyer finds
        -- out at goods issue, which is too late to buy anything.
        (SELECT count(*) FROM plywood_product p
          WHERE p.active AND p.reorder_level_units > 0
            AND COALESCE((SELECT SUM(b.qty_units) FROM stock_balance b
                           WHERE b.product_id = p.id
                             AND b.location_id = ANY(${godowns}::uuid[])), 0)
              - COALESCE((SELECT SUM(r.qty_units) FROM plywood_stock_reservation r
                           WHERE r.product_id = p.id AND r.released_at IS NULL
                             AND r.location_id = ANY(${godowns}::uuid[])), 0)
              < p.reorder_level_units)::bigint
          AS low_stock`;

    const row = rows[0] ?? {};
    const n = (key: string) => Number(row[key] ?? 0);
    return {
      salesThisMonthPaise: n("sales_this_month"),
      todaysSalesPaise: n("todays_sales"),
      openSalesOrders: n("open_sales_orders"),
      awaitingCreditApproval: n("awaiting_credit"),
      awaitingGoodsIssue: n("awaiting_goods_issue"),
      openPurchaseOrders: n("open_purchase_orders"),
      pendingReceipt: n("pending_receipt"),
      incomingUnits: n("incoming_units"),
      todaysPurchasesPaise: n("todays_purchases"),
      stockValuePaise: n("stock_value"),
      lowStockBoards: n("low_stock"),
      reservedUnits: n("reserved_units"),
      receivablesPaise: n("receivables"),
      overdueReceivablesPaise: n("overdue_receivables"),
      payablesPaise: n("payables"),
      collectionsTodayPaise: n("collections_today"),
      outputTaxPaise: n("output_tax"),
      eligibleItcPaise: n("eligible_itc"),
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

/* ============================ three-way match ============================= */

/**
 * Purchase order ↔ goods receipt ↔ supplier invoice.
 *
 * Authority: specification §29; taskplans/45_plywood_workflow_program.md §9
 * slice 3; PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-04 and §4.6.
 *
 * The accountant's question is never "what did we order?" — it is "does what
 * they billed agree with what we ordered and what actually arrived?". Three
 * numbers per line, and the differences named.
 *
 * IT REPORTS, IT DOES NOT REFUSE
 * A quantity or price difference is a conversation with the supplier, not an
 * error. Blocking the invoice would leave the business unable to record a
 * document it has physically received, which is how invoices end up in a
 * drawer instead of in the system. What is refused is invoicing an order that
 * has received *nothing* — there is no conversation to have about that.
 */
export const purchaseMatch: QueryDefinition<
  { purchaseOrderId: string },
  {
    purchaseOrderId: string;
    supplierName: string;
    state: string;
    orderedTotalPaise: number;
    receivedTotalPaise: number;
    invoicedTotalPaise: number;
    receipts: Array<{ id: string; receiptNumber: string; receivedAt: Date; lineCount: number }>;
    lines: Array<{
      productId: string;
      productName: string;
      qtyOrdered: number;
      qtyReceived: number;
      unitCostPaise: number;
      /** Ordered minus received. Positive means still owed to us. */
      qtyOutstanding: number;
    }>;
    exceptions: string[];
  }
> = {
  key: "verity.plywood.purchase_match",
  entity: ENTITY_PURCHASE_ORDER,
  input: z.object({ purchaseOrderId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const order = await ctx.tx.plywoodPurchaseOrder.findUniqueOrThrow({
      where: { id: input.purchaseOrderId },
      include: { lines: true, supplier: { select: { displayName: true } } },
    });

    const receipts = await ctx.tx.plywoodGoodsReceipt.findMany({
      where: { purchaseOrderId: order.id },
      include: { lines: { select: { id: true } } },
      orderBy: { receivedAt: "asc" },
    });

    const invoices = await ctx.tx.plywoodInvoice.findMany({
      where: { purchaseOrderId: order.id },
      select: { totalPaise: true },
    });

    const orderedTotalPaise = order.lines.reduce(
      (sum, line) => sum + line.qtyOrdered * line.unitCostPaise,
      0,
    );
    const receivedTotalPaise = order.lines.reduce(
      (sum, line) => sum + line.qtyReceived * line.unitCostPaise,
      0,
    );
    const invoicedTotalPaise = invoices.reduce((sum, invoice) => sum + invoice.totalPaise, 0);

    // Named in the words an accountant would use, not as codes. Each one is
    // something a person has to go and do.
    const exceptions: string[] = [];
    const shortLines = order.lines.filter((line) => line.qtyReceived < line.qtyOrdered);
    if (shortLines.length > 0) {
      exceptions.push(
        `${shortLines.length} line(s) not fully received: ` +
          shortLines
            .map((l) => `${l.productNameSnapshot} ${l.qtyReceived}/${l.qtyOrdered}`)
            .join(", "),
      );
    }
    if (invoicedTotalPaise > 0 && invoicedTotalPaise !== receivedTotalPaise) {
      const difference = invoicedTotalPaise - receivedTotalPaise;
      exceptions.push(
        `Invoiced ${difference > 0 ? "more" : "less"} than received by ` +
          `${Math.abs(difference) / 100} rupees`,
      );
    }
    if (receipts.length === 0) {
      exceptions.push("Nothing has been received against this order yet");
    }

    return {
      purchaseOrderId: order.id,
      supplierName: order.supplier.displayName,
      state: order.state,
      orderedTotalPaise,
      receivedTotalPaise,
      invoicedTotalPaise,
      receipts: receipts.map((receipt) => ({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        receivedAt: receipt.receivedAt,
        lineCount: receipt.lines.length,
      })),
      lines: order.lines.map((line) => ({
        productId: line.productId,
        productName: line.productNameSnapshot,
        qtyOrdered: line.qtyOrdered,
        qtyReceived: line.qtyReceived,
        unitCostPaise: line.unitCostPaise,
        qtyOutstanding: line.qtyOrdered - line.qtyReceived,
      })),
      exceptions,
    };
  },
};

/** One receipt, in full — the document a supplier dispute turns on. */
export const goodsReceiptDetail: QueryDefinition<
  { receiptId: string },
  {
    id: string;
    receiptNumber: string;
    receivedAt: Date;
    supplierChallanNumber: string | null;
    notes: string | null;
    purchaseOrderId: string;
    supplierName: string;
    locationName: string;
    lines: Array<{
      productId: string;
      productName: string;
      qtyReceived: number;
      unitCostPaise: number;
      lineValuePaise: number;
    }>;
    totalValuePaise: number;
  }
> = {
  key: "verity.plywood.goods_receipt_detail",
  entity: ENTITY_PURCHASE_ORDER,
  input: z.object({ receiptId: z.string().uuid() }),
  handler: async (ctx, input) => {
    const receipt = await ctx.tx.plywoodGoodsReceipt.findUniqueOrThrow({
      where: { id: input.receiptId },
      include: {
        lines: true,
        location: { select: { name: true } },
        purchaseOrder: { include: { supplier: { select: { displayName: true } } } },
      },
    });

    const lines = receipt.lines.map((line) => ({
      productId: line.productId,
      productName: line.productNameSnapshot,
      qtyReceived: line.qtyReceived,
      unitCostPaise: line.unitCostPaise,
      lineValuePaise: line.qtyReceived * line.unitCostPaise,
    }));

    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receivedAt: receipt.receivedAt,
      supplierChallanNumber: receipt.supplierChallanNumber,
      notes: receipt.notes,
      purchaseOrderId: receipt.purchaseOrderId,
      supplierName: receipt.purchaseOrder.supplier.displayName,
      locationName: receipt.location.name,
      lines,
      totalValuePaise: lines.reduce((sum, line) => sum + line.lineValuePaise, 0),
    };
  },
};

/* =========================== credit / debit notes ========================= */

/**
 * Corrects a posted invoice, without touching it.
 *
 * Authority: specification §67; taskplans/45_plywood_workflow_program.md §5;
 * PLYWOOD_TARGET_WORKFLOW_GAP_AUDIT.md P0-05.
 *
 * Slice 1 made a posted invoice immutable for every role including a
 * privileged one. That rule is only workable because this exists: a second
 * document that points at the invoice rather than an amendment to it. Both
 * stand afterwards — the invoice is what the customer holds and what was
 * reported; the note is what changed.
 *
 * TAX IS COPIED, NOT RECOMPUTED
 * The note carries the invoice's own rates. Recomputing from today's
 * configuration would mean a rate change between the sale and the correction
 * silently produces a note that does not reconcile to the document it corrects
 * — and the difference would appear in a return with nothing to explain it.
 *
 * MONEY, NOT STOCK
 * A credit note does not put boards back in the godown. Returned material is a
 * separate physical event with its own movement (§4.5), and pretending one
 * implies the other is how stock and money stop agreeing.
 */
export const raiseInvoiceNote: CommandDefinition<
  {
    invoiceId: string;
    noteType: "credit" | "debit";
    taxablePaise: number;
    reason: string;
  },
  { id: string; noteNumber: string; totalPaise: number }
> = {
  key: "verity.plywood.raise_invoice_note",
  entity: ENTITY_INVOICE,
  verb: "Create",
  input: z.object({
    invoiceId: z.string().uuid(),
    noteType: z.enum(["credit", "debit"]),
    taxablePaise: z.number().int().positive(),
    // A note with no reason is the entry nobody can explain, and a tax officer
    // asking about one is asking exactly this.
    reason: z.string().min(3).max(400),
  }),
  handler: async (ctx, input) => {
    const invoice = await ctx.tx.plywoodInvoice.findUniqueOrThrow({
      where: { id: input.invoiceId },
      include: { notes: true },
    });

    // A credit note cannot exceed what is left on the invoice after earlier
    // ones. Crediting more than was ever charged is a refund, which is a
    // payment out, not a correction to a sale.
    if (input.noteType === "credit") {
      const alreadyCredited = invoice.notes
        .filter((note) => note.noteType === "credit")
        .reduce((sum, note) => sum + note.taxablePaise, 0);
      const creditable = invoice.taxablePaise - alreadyCredited;
      if (input.taxablePaise > creditable) {
        throw new ValidationError(
          `E_VALIDATION: only ${creditable / 100} rupees of this invoice remain creditable ` +
            `(${invoice.taxablePaise / 100} invoiced, ${alreadyCredited / 100} already credited)`,
        );
      }
    }

    // The invoice's own rates, not today's.
    const cgstPaise = Math.round((input.taxablePaise * invoice.cgstRateBp) / 10_000);
    const sgstPaise = Math.round((input.taxablePaise * invoice.sgstRateBp) / 10_000);
    const igstPaise = Math.round((input.taxablePaise * invoice.igstRateBp) / 10_000);
    const totalPaise = input.taxablePaise + cgstPaise + sgstPaise + igstPaise;

    const issuedAt = new Date();
    await assertPeriodOpen(ctx.tx, issuedAt);
    const financialYear = financialYearOf(issuedAt);
    const seriesKey = input.noteType === "credit" ? "CN" : "DN";
    const numbering = await nextDocumentNumber(ctx.tx, ctx.actor.tenantId, seriesKey, financialYear);

    const note = await ctx.tx.plywoodInvoiceNote.create({
      data: {
        tenantId: ctx.actor.tenantId,
        invoiceId: invoice.id,
        noteType: input.noteType,
        noteNumber: numbering.invoiceNumber,
        financialYear,
        taxablePaise: input.taxablePaise,
        cgstPaise,
        sgstPaise,
        igstPaise,
        totalPaise,
        reason: input.reason,
        issuedAt,
        issuedBy: ctx.actor.userId,
      },
    });

    // The party ledger moves the opposite way to the invoice it corrects. A
    // customer credit note reduces what they owe; a supplier one reduces what
    // this business owes.
    await ctx.tx.plywoodLedgerEntry.create({
      data: {
        tenantId: ctx.actor.tenantId,
        customerId: invoice.customerId,
        supplierId: invoice.supplierId,
        entryType: input.noteType === "credit" ? "credit" : "debit",
        amountPaise: totalPaise,
        invoiceId: invoice.id,
        narration: `${note.noteNumber} against ${invoice.invoiceNumber}: ${input.reason}`,
        occurredAt: issuedAt,
      },
    });

    return {
      result: { id: note.id, noteNumber: note.noteNumber, totalPaise },
      events: [
        {
          name:
            input.noteType === "credit"
              ? "verity.plywood.credit_note_raised"
              : "verity.plywood.debit_note_raised",
          entityId: note.id,
          payload: { invoiceNumber: invoice.invoiceNumber, totalPaise },
        },
      ],
    };
  },
};
