import "server-only";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { PACK_PRICE, PLATFORM_FEE, TEAM_BRACKET, modulePrice } from "@/platform/pricing";
import { entitledModules } from "@/platform/modules/entitlements";
import { getModule, type ModuleKey } from "@/platform/modules/registry";
import type { VerticalPackKey } from "@/platform/tenancy/packs";

/**
 * Invoice generation.
 *
 * Builds a month's bill from the charge lines that were open during the period.
 * Deliberately boring: it reads lines, sums them, and writes a frozen copy. All
 * the judgement lives in how the lines are maintained, not here.
 *
 * Three rules the shape enforces:
 *
 *  1. **Idempotent.** `@@unique([subscriptionId, periodStart])` means a cron that
 *     fires twice cannot bill twice — the second attempt returns the first
 *     invoice rather than creating a second.
 *  2. **Frozen lines.** An invoice copies its lines instead of pointing at them.
 *     A statement has to render identically in two years, after the module was
 *     re-priced or retired.
 *  3. **Monthly proration.** A module active for any part of a month is charged
 *     for the month. Stated on the invoice, because a silent rule is a dispute.
 */

/** Reserved line keys that are not modules. */
export const PLATFORM_LINE = "platform";
export const TEAM_LINE = "team";

export interface ChargeLine {
  itemKey: string;
  label: string;
  unitPrice: number;
  quantity: number;
}

/**
 * The lines a subscription *should* have, derived from its pack or entitlements
 * plus its team bracket.
 *
 * This is the intent. `syncSubscriptionLines` reconciles the stored lines
 * towards it, which is what makes deactivating a module lower the next bill.
 */
export async function intendedLines(organizationId: string): Promise<ChargeLine[]> {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { organizationId },
    select: { packKey: true, teamSizeBracket: true },
  });
  if (!subscription) return [];

  const lines: ChargeLine[] = [];

  if (subscription.packKey && subscription.packKey in PACK_PRICE) {
    const packKey = subscription.packKey as VerticalPackKey;
    // A pack is one line, not a discounted list of modules. An invoice showing
    // seven modules and a mystery "discount" row invites the question "which
    // module was the discount on?", which has no answer.
    lines.push({
      itemKey: `pack:${packKey}`,
      label: `${packKey.replace(/_/g, " ")} pack`,
      unitPrice: PACK_PRICE[packKey],
      quantity: 1,
    });
  } else {
    lines.push({
      itemKey: PLATFORM_LINE,
      label: "Platform",
      unitPrice: PLATFORM_FEE,
      quantity: 1,
    });

    // À la carte: one line per entitled, chargeable module. Always-on modules
    // price at zero and are omitted rather than shown as free clutter.
    const active = await entitledModules(organizationId);
    for (const key of active) {
      const price = modulePrice(key as ModuleKey);
      if (price <= 0) continue;
      lines.push({
        itemKey: key,
        label: getModule(key as ModuleKey)?.name ?? key,
        unitPrice: price,
        quantity: 1,
      });
    }
  }

  const bracket = TEAM_BRACKET[subscription.teamSizeBracket];
  if (bracket.monthly > 0) {
    lines.push({
      itemKey: TEAM_LINE,
      label: `Team size — ${bracket.label}`,
      unitPrice: bracket.monthly,
      quantity: 1,
    });
  }

  return lines;
}

/**
 * Reconcile stored lines against what the subscription should be charged.
 *
 * Opens lines that are missing and closes lines that should no longer be
 * charged. **Closes, never deletes** — a deleted line makes last month's
 * invoice unexplainable.
 *
 * Returns what changed, so an operator action can report it rather than
 * silently adjusting someone's bill.
 */
export async function syncSubscriptionLines(
  organizationId: string,
): Promise<{ opened: string[]; closed: string[] }> {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { organizationId },
    select: { id: true },
  });
  if (!subscription) return { opened: [], closed: [] };

  const [intended, open] = await Promise.all([
    intendedLines(organizationId),
    prisma.subscriptionLine.findMany({
      where: { subscriptionId: subscription.id, activeTo: null },
      select: { id: true, itemKey: true, unitPrice: true },
    }),
  ]);

  const intendedByKey = new Map(intended.map((line) => [line.itemKey, line]));
  const openByKey = new Map(open.map((line) => [line.itemKey, line]));
  const now = new Date();

  const closed: string[] = [];
  const opened: string[] = [];

  for (const line of open) {
    const want = intendedByKey.get(line.itemKey);
    // Gone, or re-priced. A price change closes the old line and opens a new one
    // rather than editing in place, so the invoice history stays truthful about
    // what was charged when.
    if (!want || want.unitPrice !== line.unitPrice) {
      await prisma.subscriptionLine.update({
        where: { id: line.id },
        data: { activeTo: now },
      });
      closed.push(line.itemKey);
    }
  }

  for (const line of intended) {
    const existing = openByKey.get(line.itemKey);
    if (existing && existing.unitPrice === line.unitPrice) continue;
    await prisma.subscriptionLine.create({
      data: {
        subscriptionId: subscription.id,
        itemKey: line.itemKey,
        label: line.label,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        activeFrom: now,
      },
    });
    opened.push(line.itemKey);
  }

  return { opened, closed };
}

/** The next invoice's total, without writing anything. For the operator screen. */
export async function projectedTotal(organizationId: string): Promise<number> {
  const lines = await intendedLines(organizationId);
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

/** Sequential per tenant, so an accountant can see a gap. */
async function nextInvoiceNumber(subscriptionId: string): Promise<string> {
  const count = await prisma.platformInvoice.count({ where: { subscriptionId } });
  return `VF-${subscriptionId.slice(-6).toUpperCase()}-${String(count + 1).padStart(4, "0")}`;
}

export interface GeneratedInvoice {
  invoiceId: string;
  invoiceNumber: string;
  total: number;
  /** True when this period was already invoiced and the existing one is returned. */
  alreadyExisted: boolean;
}

/**
 * Cut an invoice for one subscription and period.
 *
 * A line is charged when it overlapped the period at all — monthly proration,
 * per the rule above. `activeTo` being null means still open, which overlaps by
 * definition.
 */
export async function generateInvoice(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<GeneratedInvoice | null> {
  const subscription = await prisma.tenantSubscription.findUnique({
    where: { organizationId },
    select: { id: true, status: true },
  });
  if (!subscription) return null;

  // A trial is not billed. It has lines priced at zero anyway, but generating an
  // invoice for ₹0 sends a tenant a bill for nothing, which reads as a mistake.
  if (subscription.status === "TRIAL") return null;

  const existing = await prisma.platformInvoice.findUnique({
    where: { subscriptionId_periodStart: { subscriptionId: subscription.id, periodStart } },
    select: { id: true, invoiceNumber: true, total: true },
  });
  if (existing) {
    return {
      invoiceId: existing.id,
      invoiceNumber: existing.invoiceNumber,
      total: existing.total,
      alreadyExisted: true,
    };
  }

  const lines = await prisma.subscriptionLine.findMany({
    where: {
      subscriptionId: subscription.id,
      activeFrom: { lte: periodEnd },
      OR: [{ activeTo: null }, { activeTo: { gte: periodStart } }],
    },
    select: { itemKey: true, label: true, unitPrice: true, quantity: true },
  });

  const invoiceLines = lines.map((line) => ({
    itemKey: line.itemKey,
    label: line.label,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    amount: line.unitPrice * line.quantity,
  }));
  const total = invoiceLines.reduce((sum, line) => sum + line.amount, 0);

  const invoiceNumber = await nextInvoiceNumber(subscription.id);

  try {
    const invoice = await prisma.platformInvoice.create({
      data: {
        subscriptionId: subscription.id,
        organizationId,
        invoiceNumber,
        periodStart,
        periodEnd,
        subtotal: total,
        total,
        status: "DRAFT",
        lines: { create: invoiceLines },
      },
      select: { id: true, invoiceNumber: true, total: true },
    });

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      alreadyExisted: false,
    };
  } catch (error) {
    // Two runs racing on the same period. The unique constraint is the real
    // guarantee; the earlier read is only a fast path. Return the winner.
    if ((error as Prisma.PrismaClientKnownRequestError)?.code === "P2002") {
      const winner = await prisma.platformInvoice.findUnique({
        where: { subscriptionId_periodStart: { subscriptionId: subscription.id, periodStart } },
        select: { id: true, invoiceNumber: true, total: true },
      });
      if (winner) {
        return {
          invoiceId: winner.id,
          invoiceNumber: winner.invoiceNumber,
          total: winner.total,
          alreadyExisted: true,
        };
      }
    }
    throw error;
  }
}

/** The calendar month containing `date`. */
export function monthPeriod(date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
