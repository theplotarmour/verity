import "server-only";

import prisma from "@/lib/prisma";
import { createWithDocNumber } from "@/lib/server/numbering";

/**
 * Customer invoicing, minus the request.
 *
 * `createInvoice` in `server/actions/billing.ts` is a server action: it checks a
 * session, checks an entitlement, then writes. The write half is also what an
 * event reaction needs when a completed visit should raise a draft bill, and a
 * reaction has no form submission to authorise — it runs behind a milestone that
 * was already authorised.
 *
 * So the write lives here, once, and both callers use it. The alternative was a
 * second copy of the numbering and rounding rules inside `reactions.ts`, which is
 * exactly the duplication that put `hashPin` in two places.
 *
 * This module authorises nothing. Every caller must have established the tenant
 * and the entitlement before it gets here — `factoryId` is a fact by this point,
 * never a value off a request.
 */

export interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

/** Money is rounded once, here, so a total never disagrees with its lines. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function priceLines(lines: LineItemInput[]) {
  const priced = lines
    .filter((l) => l.description?.trim())
    .map((l) => {
      const quantity = Number(l.quantity) || 0;
      const unitPrice = Number(l.unitPrice) || 0;
      const taxRate = Number(l.taxRate) || 0;
      const amount = round2(quantity * unitPrice);
      return { description: l.description.trim(), quantity, unitPrice, taxRate, amount };
    });

  const subtotal = round2(priced.reduce((sum, l) => sum + l.amount, 0));
  const taxAmount = round2(priced.reduce((sum, l) => sum + (l.amount * l.taxRate) / 100, 0));
  return { priced, subtotal, taxAmount, total: round2(subtotal + taxAmount) };
}

export interface DraftInvoiceInput {
  factoryId: string;
  customerId: string;
  siteId?: string | null;
  dueDate?: Date | null;
  notes?: string | null;
  lineItems: LineItemInput[];
}

/**
 * Write a DRAFT customer invoice.
 *
 * Returns the new invoice id, or null when the customer does not belong to the
 * tenant or the lines price to nothing. Null rather than a throw: the reaction
 * path treats "no bill to raise" as an ordinary outcome, and the action path
 * turns it into its own message.
 */
export async function draftServiceInvoice(input: DraftInvoiceInput): Promise<string | null> {
  const { factoryId } = input;

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, factoryId },
    select: { id: true },
  });
  if (!customer) return null;

  const { priced, subtotal, taxAmount, total } = priceLines(input.lineItems ?? []);
  if (priced.length === 0) return null;

  // Numbering is per financial year in the way Indian invoicing expects, and
  // the sequence counts only that year's invoices so it restarts cleanly.
  const year = new Date().getFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const base =
    (await prisma.serviceInvoice.count({ where: { factoryId, issueDate: { gte: yearStart } } })) + 1;

  const invoice = await createWithDocNumber(
    (attempt) => `INV-${year}-${String(base + attempt).padStart(5, "0")}`,
    (invoiceNumber) =>
      prisma.serviceInvoice.create({
        data: {
          factoryId,
          invoiceNumber,
          customerId: customer.id,
          siteId: input.siteId || null,
          dueDate: input.dueDate ?? null,
          notes: input.notes?.trim() || null,
          subtotal,
          taxAmount,
          total,
          lineItems: { create: priced },
        },
        select: { id: true },
      }),
  );

  return invoice.id;
}
