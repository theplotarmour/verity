"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { canUser } from "@/lib/server/permissions";
import { getSubscription } from "@/platform/billing/subscription";
import { intendedLines, projectedTotal } from "@/platform/billing/invoices";
import { PACK_PRICE, TEAM_BRACKET, TRIAL, formatPrice } from "@/platform/pricing";
import { VERTICAL_PACKS } from "@/platform/tenancy/packs";

/**
 * A tenant's own view of what they are paying and why.
 *
 * Read-only. Nothing here changes a subscription — a tenant who could edit their
 * own bracket could give themselves eighty users for the price of ten, and the
 * bracket is the only thing between those two invoices.
 *
 * The factory comes from the session, never a parameter. Same rule as
 * `integrations.ts`, and asserted by the same test.
 */

export interface BillingAccountView {
  status: string;
  statusLabel: string;
  /** Set while on a trial. */
  trialDaysLeft: number | null;
  trialEndsAt: string | null;
  /** Set once the workspace is read-only, from which retention counts. */
  readOnlySince: string | null;
  retentionDaysLeft: number | null;
  frozen: boolean;

  pack: { key: string; label: string; price: number; priceLabel: string } | null;
  bracket: { key: string; label: string; price: number; priceLabel: string };

  lines: { itemKey: string; label: string; price: number; priceLabel: string }[];
  monthlyTotal: number;
  monthlyTotalLabel: string;

  invoices: {
    id: string;
    invoiceNumber: string;
    periodStart: string;
    periodEnd: string;
    total: number;
    totalLabel: string;
    status: string;
    issuedAt: string | null;
    paidAt: string | null;
  }[];
}

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  TRIAL_EXPIRED: "Trial ended — read-only",
  READ_ONLY: "Read-only",
  CANCELLED: "Cancelled",
};

export async function getBillingAccount(): Promise<BillingAccountView | null> {
  const user = await getOwnerUser();
  if (!user) return null;
  // Billing figures are owner-level. A supervisor does not need to know the
  // company's monthly spend to do their job.
  if (!(await canUser(user, "ACCESS_BILLING"))) return null;

  const organizationId = user.factory?.organizationId;
  if (!organizationId) return null;

  const [subscription, lines, total] = await Promise.all([
    getSubscription(organizationId),
    intendedLines(organizationId),
    projectedTotal(organizationId),
  ]);

  // No subscription row means this tenant predates metering. Say so plainly
  // rather than rendering zeroes, which would read as "you owe nothing".
  if (!subscription) return null;

  const packKey = subscription.packKey;
  const pack =
    packKey && packKey in VERTICAL_PACKS
      ? {
          key: packKey,
          label: VERTICAL_PACKS[packKey].label,
          price: PACK_PRICE[packKey as keyof typeof PACK_PRICE] ?? 0,
          priceLabel: formatPrice(PACK_PRICE[packKey as keyof typeof PACK_PRICE] ?? 0),
        }
      : null;

  const bracket = TEAM_BRACKET[subscription.teamSizeBracket];

  // Retention counts from readOnlySince, not from the trial end — a tenant who
  // paid for six months and then lapsed gets their full window from the day they
  // actually lost write access.
  const retentionDaysLeft = subscription.readOnlySince
    ? Math.max(
        0,
        TRIAL.readOnlyRetentionDays -
          Math.floor((Date.now() - subscription.readOnlySince.getTime()) / 86_400_000),
      )
    : null;

  const subscriptionRow = await prisma.tenantSubscription.findUnique({
    where: { organizationId },
    select: { id: true },
  });

  const invoices = subscriptionRow
    ? await prisma.platformInvoice.findMany({
        where: { subscriptionId: subscriptionRow.id },
        select: {
          id: true,
          invoiceNumber: true,
          periodStart: true,
          periodEnd: true,
          // The frozen total, not a recomputation. An invoice is a historical
          // statement and must render identically after a price change.
          total: true,
          status: true,
          issuedAt: true,
          paidAt: true,
        },
        orderBy: { periodStart: "desc" },
        take: 24,
      })
    : [];

  return {
    status: subscription.status,
    statusLabel: STATUS_LABEL[subscription.status] ?? subscription.status,
    trialDaysLeft: subscription.trialDaysLeft,
    trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
    readOnlySince: subscription.readOnlySince?.toISOString() ?? null,
    retentionDaysLeft,
    frozen: subscription.frozen,

    pack,
    bracket: {
      key: subscription.teamSizeBracket,
      label: bracket.label,
      price: bracket.monthly,
      priceLabel: bracket.monthly === 0 ? "Included" : formatPrice(bracket.monthly),
    },

    lines: lines.map((line) => ({
      itemKey: line.itemKey,
      label: line.label,
      price: line.unitPrice * line.quantity,
      priceLabel: formatPrice(line.unitPrice * line.quantity),
    })),
    monthlyTotal: total,
    monthlyTotalLabel: formatPrice(total),

    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      periodStart: invoice.periodStart.toISOString(),
      periodEnd: invoice.periodEnd.toISOString(),
      total: invoice.total,
      totalLabel: formatPrice(invoice.total),
      status: invoice.status,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      paidAt: invoice.paidAt?.toISOString() ?? null,
    })),
  };
}
