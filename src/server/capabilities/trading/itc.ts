import { z } from "zod";
import { periodKeyOf } from "./period";
import { businessPeriodWindow, businessZone } from "./clock";
import {
  registerCommand,
  ValidationError,
  type CommandDefinition,
} from "@/server/platform/command";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { recordActivity } from "@/server/platform/audit";
import { ENTITY_INVOICE } from "./keys";

/**
 * PLYWOOD — input tax credit reconciliation (§59).
 *
 * §59 asks the accountant to compare the purchase register against the GST
 * portal and work only the differences. That comparison needs two datasets and
 * this system held one, which is why it was previously escalated rather than
 * built: every bucket §59 names is a statement about rows that are not ours.
 *
 * THE IMPLEMENTATION DECISION, recorded because the specification does not make
 * it. Portal data arrives by **explicit import of parsed rows**, not by holding
 * portal credentials and fetching. Storing a client's GST portal login would
 * make this system a target for something far worse than its own data, and the
 * specification never asked for automation — §59 asks for a comparison. An
 * import is also repeatable and auditable, which a scrape is not.
 *
 * WHAT IS NOT STORED: no credentials, no session, no uploaded file. The import
 * takes rows and keeps only the fields the comparison needs.
 *
 * THIS DATA IS NEVER POSTED FROM. No payable, ledger entry or credit derives
 * from a portal row. What the business owes is what its suppliers billed it;
 * the portal is a second opinion used to find disagreements. Treating it as
 * truth would let an outside file rewrite the books.
 */

/** Two digits, five letters, four digits, letter, alnum, Z, alnum. */
const GSTIN = z
  .string()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/,
    "that is not a valid GSTIN",
  );

const PERIOD_KEY = z
  .string()
  .regex(/^[0-9]{4}-[0-9]{2}$/, "a period is YYYY-MM");

/**
 * Replaces one period's portal rows with what was imported.
 *
 * REPLACE, NOT APPEND. The portal amends a period after the fact, and an import
 * that added rows would leave a superseded version sitting beside the current
 * one, matching twice and reporting differences that no longer exist. Replacing
 * the period makes re-importing safe, which matters because an accountant will
 * re-import whenever the portal changes.
 *
 * Scoped to ONE period per call for the same reason: a partial file must not be
 * able to silently empty a period it never mentioned.
 */
export const importGstPortalRecords: CommandDefinition<
  {
    periodKey: string;
    sourceRef?: string;
    rows: Array<{
      supplierGstin: string;
      supplierName?: string;
      invoiceNumber: string;
      invoiceDate: string;
      taxablePaise: number;
      cgstPaise?: number;
      sgstPaise?: number;
      igstPaise?: number;
      totalPaise: number;
    }>;
  },
  { periodKey: string; imported: number; replaced: number }
> = {
  key: "verity.trading.import_gst_portal_records",
  entity: ENTITY_INVOICE,
  // Not Create: importing does not create an invoice, and giving this the same
  // verb as raising one would let anyone who may import also raise documents.
  verb: "ActionExecute",
  input: z.object({
    periodKey: PERIOD_KEY,
    sourceRef: z.string().max(200).optional(),
    rows: z
      .array(
        z.object({
          supplierGstin: GSTIN,
          supplierName: z.string().max(200).optional(),
          invoiceNumber: z.string().min(1).max(60),
          invoiceDate: z.string().datetime(),
          taxablePaise: z.number().int().min(0),
          cgstPaise: z.number().int().min(0).optional(),
          sgstPaise: z.number().int().min(0).optional(),
          igstPaise: z.number().int().min(0).optional(),
          totalPaise: z.number().int().min(0),
        }),
      )
      .min(1)
      .max(5000),
  }),
  handler: async (ctx, input) => {
    // Validated before anything is deleted. A file whose figures do not add up
    // must not be able to empty a period it then fails to refill.
    for (const row of input.rows) {
      const cgst = row.cgstPaise ?? 0;
      const sgst = row.sgstPaise ?? 0;
      const igst = row.igstPaise ?? 0;
      if (row.taxablePaise + cgst + sgst + igst !== row.totalPaise) {
        throw new ValidationError(
          `E_VALIDATION: ${row.invoiceNumber} does not add up — taxable plus tax must equal the total`,
        );
      }
      if (igst > 0 && (cgst > 0 || sgst > 0)) {
        throw new ValidationError(
          `E_VALIDATION: ${row.invoiceNumber} carries IGST and CGST/SGST together`,
        );
      }
    }

    const seen = new Set<string>();
    for (const row of input.rows) {
      const key = `${row.supplierGstin}:${row.invoiceNumber}`;
      if (seen.has(key)) {
        throw new ValidationError(
          `E_VALIDATION: ${row.invoiceNumber} appears twice for the same supplier in this file`,
        );
      }
      seen.add(key);
    }

    const removed = await ctx.tx.tradingGstPortalRecord.deleteMany({
      where: { periodKey: input.periodKey },
    });

    await ctx.tx.tradingGstPortalRecord.createMany({
      data: input.rows.map((row) => ({
        tenantId: ctx.actor.tenantId,
        periodKey: input.periodKey,
        supplierGstin: row.supplierGstin,
        supplierName: row.supplierName ?? null,
        invoiceNumber: row.invoiceNumber,
        invoiceDate: new Date(row.invoiceDate),
        taxablePaise: row.taxablePaise,
        cgstPaise: row.cgstPaise ?? 0,
        sgstPaise: row.sgstPaise ?? 0,
        igstPaise: row.igstPaise ?? 0,
        totalPaise: row.totalPaise,
        importedBy: ctx.actor.userId,
        sourceRef: input.sourceRef ?? null,
      })),
    });

    await recordActivity(ctx, {
      entityKey: ENTITY_INVOICE,
      entityId: ctx.actor.tenantId,
      commandKey: "verity.trading.import_gst_portal_records",
      changes: [
        {
          field: `GST portal data for ${input.periodKey}`,
          oldValue: `${removed.count} row(s)`,
          newValue: `${input.rows.length} row(s)`,
        },
      ],
    });

    return {
      result: {
        periodKey: input.periodKey,
        imported: input.rows.length,
        replaced: removed.count,
      },
      events: [
        {
          name: "verity.trading.gst_portal_records_imported",
          entityId: ctx.actor.tenantId,
        },
      ],
    };
  },
};

/** The five buckets §59 names, plus the matched case. */
export type ItcBucket =
  | "matched"
  | "amount_mismatch"
  | "missing_in_gst"
  | "missing_in_verity"
  | "gstin_mismatch";

/**
 * §59 — the purchase register against the portal.
 *
 * MATCHED ON SUPPLIER GSTIN PLUS THE SUPPLIER'S INVOICE NUMBER, because that is
 * the pair the portal keys on. Our own invoice number is a different number in
 * our own series; matching on it would match nothing and report the entire
 * register as missing.
 *
 * A purchase invoice recorded WITHOUT the supplier's number cannot be matched
 * at all. That is reported as its own condition rather than silently landing in
 * "missing in GST", which would accuse the supplier of not filing when the gap
 * is on this side.
 */
export const itcReconciliation: QueryDefinition<
  { periodKey?: string },
  {
    periodKey: string;
    portalRowCount: number;
    registerRowCount: number;
    /// Everything the portal reported, matched or not.
    portalTaxPaise: number;
    /// Everything our suppliers billed us.
    booksTaxPaise: number;
    /// What both agree on — the credit that can be evidenced.
    matchedTaxPaise: number;
    rows: Array<{
      bucket: ItcBucket;
      supplierGstin: string | null;
      supplierName: string | null;
      /// The supplier's number, which is the key both sides share.
      invoiceNumber: string;
      /// Ours, when we hold the document.
      ourInvoiceId: string | null;
      ourInvoiceNumber: string | null;
      booksTaxPaise: number | null;
      portalTaxPaise: number | null;
      differencePaise: number | null;
      detail: string;
    }>;
    unmatchable: Array<{
      invoiceId: string;
      invoiceNumber: string;
      supplierName: string;
      taxPaise: number;
    }>;
  }
> = {
  key: "verity.trading.itc_reconciliation",
  entity: ENTITY_INVOICE,
  input: z.object({ periodKey: PERIOD_KEY.optional() }),
  handler: async (ctx, input) => {
    // The period, and the window it covers, in the business's own zone (U0-3).
    // A reconciliation that used UTC boundaries would compare a purchase
    // register cut one way against a portal file cut the other, and report
    // differences that are only calendar arithmetic.
    const zone = await businessZone(ctx);
    const periodKey = input.periodKey ?? periodKeyOf(new Date(), zone);
    const { startsAt: from, endsAt: to } = businessPeriodWindow(
      zone,
      periodKey,
    );

    const [portal, invoices] = await Promise.all([
      ctx.tx.tradingGstPortalRecord.findMany({ where: { periodKey } }),
      ctx.tx.tradingInvoice.findMany({
        where: { supplierId: { not: null }, issuedAt: { gte: from, lt: to } },
        include: { supplier: { select: { displayName: true, gstin: true } } },
      }),
    ]);

    const taxOf = (row: {
      cgstPaise: number;
      sgstPaise: number;
      igstPaise: number;
    }) => row.cgstPaise + row.sgstPaise + row.igstPaise;

    const rows: Awaited<ReturnType<typeof itcReconciliation.handler>>["rows"] =
      [];
    const unmatchable: Awaited<
      ReturnType<typeof itcReconciliation.handler>
    >["unmatchable"] = [];

    // Our register, keyed the way the portal keys it.
    const register = new Map<string, (typeof invoices)[number]>();
    for (const invoice of invoices) {
      const fields = (invoice.customFields ?? {}) as Record<string, unknown>;
      const supplierNumber =
        typeof fields.supplierInvoiceNumber === "string"
          ? fields.supplierInvoiceNumber
          : null;
      if (!supplierNumber || !invoice.supplier?.gstin) {
        unmatchable.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          supplierName: invoice.supplier?.displayName ?? "Unknown supplier",
          taxPaise: taxOf(invoice),
        });
        continue;
      }
      register.set(`${invoice.supplier.gstin}:${supplierNumber}`, invoice);
    }

    const usedFromRegister = new Set<string>();

    for (const record of portal) {
      const key = `${record.supplierGstin}:${record.invoiceNumber}`;
      const ours = register.get(key);
      const portalTax = taxOf(record);

      if (!ours) {
        // The portal has it and we do not. Either the bill never reached the
        // office, or it was recorded against a different supplier GSTIN — which
        // is a separate bucket below, checked before this one is trusted.
        const gstinMismatch = [...register.entries()].find(
          ([candidateKey, candidate]) =>
            candidateKey.endsWith(`:${record.invoiceNumber}`) &&
            candidate.supplier?.gstin !== record.supplierGstin,
        );
        if (gstinMismatch) {
          const [, candidate] = gstinMismatch;
          usedFromRegister.add(
            `${candidate.supplier?.gstin}:${record.invoiceNumber}`,
          );
          rows.push({
            bucket: "gstin_mismatch",
            supplierGstin: record.supplierGstin,
            supplierName:
              record.supplierName ?? candidate.supplier?.displayName ?? null,
            invoiceNumber: record.invoiceNumber,
            ourInvoiceId: candidate.id,
            ourInvoiceNumber: candidate.invoiceNumber,
            booksTaxPaise: taxOf(candidate),
            portalTaxPaise: portalTax,
            differencePaise: taxOf(candidate) - portalTax,
            detail: `Recorded against ${candidate.supplier?.gstin ?? "no GSTIN"}, filed under ${record.supplierGstin}`,
          });
          continue;
        }

        rows.push({
          bucket: "missing_in_verity",
          supplierGstin: record.supplierGstin,
          supplierName: record.supplierName ?? null,
          invoiceNumber: record.invoiceNumber,
          ourInvoiceId: null,
          ourInvoiceNumber: null,
          booksTaxPaise: null,
          portalTaxPaise: portalTax,
          differencePaise: null,
          detail:
            "The supplier filed it; there is no purchase invoice recorded here",
        });
        continue;
      }

      usedFromRegister.add(key);
      const booksTax = taxOf(ours);
      if (booksTax === portalTax) {
        rows.push({
          bucket: "matched",
          supplierGstin: record.supplierGstin,
          supplierName:
            record.supplierName ?? ours.supplier?.displayName ?? null,
          invoiceNumber: record.invoiceNumber,
          ourInvoiceId: ours.id,
          ourInvoiceNumber: ours.invoiceNumber,
          booksTaxPaise: booksTax,
          portalTaxPaise: portalTax,
          differencePaise: 0,
          detail: "Books and portal agree",
        });
      } else {
        rows.push({
          bucket: "amount_mismatch",
          supplierGstin: record.supplierGstin,
          supplierName:
            record.supplierName ?? ours.supplier?.displayName ?? null,
          invoiceNumber: record.invoiceNumber,
          ourInvoiceId: ours.id,
          ourInvoiceNumber: ours.invoiceNumber,
          booksTaxPaise: booksTax,
          portalTaxPaise: portalTax,
          differencePaise: booksTax - portalTax,
          detail: "The tax recorded here differs from what the supplier filed",
        });
      }
    }

    // Ours, that the portal never mentioned. The credit is claimed in the books
    // and unsupported by the portal, which is the case an accountant most needs
    // to see before filing.
    for (const [key, invoice] of register) {
      if (usedFromRegister.has(key)) continue;
      const [gstin, supplierNumber] = key.split(":");
      rows.push({
        bucket: "missing_in_gst",
        supplierGstin: gstin ?? null,
        supplierName: invoice.supplier?.displayName ?? null,
        invoiceNumber: supplierNumber ?? "",
        ourInvoiceId: invoice.id,
        ourInvoiceNumber: invoice.invoiceNumber,
        booksTaxPaise: taxOf(invoice),
        portalTaxPaise: null,
        differencePaise: null,
        detail: "Recorded here; the supplier has not filed it",
      });
    }

    const order: ItcBucket[] = [
      "amount_mismatch",
      "gstin_mismatch",
      "missing_in_gst",
      "missing_in_verity",
      "matched",
    ];

    return {
      periodKey,
      portalRowCount: portal.length,
      registerRowCount: invoices.length,
      portalTaxPaise: portal.reduce((sum, row) => sum + taxOf(row), 0),
      booksTaxPaise: invoices.reduce((sum, row) => sum + taxOf(row), 0),
      matchedTaxPaise: rows
        .filter((row) => row.bucket === "matched")
        .reduce((sum, row) => sum + (row.portalTaxPaise ?? 0), 0),
      // Exceptions first, matched last: §59's point is that an accountant
      // works the differences, so the differences lead.
      rows: rows.sort(
        (a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket),
      ),
      unmatchable,
    };
  },
};

export function registerItc(): void {
  registerCommand(importGstPortalRecords);
  registerQuery(itcReconciliation);
}
