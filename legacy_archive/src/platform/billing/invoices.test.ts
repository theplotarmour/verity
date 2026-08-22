import { describe, it, expect, beforeAll, afterAll } from "vitest";

import prisma from "@/lib/prisma";
import {
  PLATFORM_LINE,
  TEAM_LINE,
  generateInvoice,
  intendedLines,
  monthPeriod,
  projectedTotal,
  syncSubscriptionLines,
} from "./invoices";
import { PACK_PRICE, PLATFORM_FEE, TEAM_BRACKET } from "@/platform/pricing";

/**
 * Invoice generation, against the real database.
 *
 * Two failures matter more than the arithmetic.
 *
 * Double billing: a cron that fires twice must not produce two invoices. That is
 * a customer emailing about being charged twice, and it is the kind of bug that
 * only appears in production because locally the job runs once.
 *
 * Unexplainable history: a closed line must stay readable, so last month's
 * invoice can still be justified after a module is re-priced or removed.
 */
describe("invoice generation", () => {
  let organizationId: string;
  let subscriptionId: string;
  let seeded = false;

  beforeAll(async () => {
    // A throwaway organisation, so nothing here touches a real tenant's billing.
    const org = await prisma.organization.create({
      data: {
        name: "Invoice Test Org",
        slug: `invoice-test-${Date.now().toString(36)}`,
      },
      select: { id: true },
    });
    organizationId = org.id;

    const subscription = await prisma.tenantSubscription.create({
      data: {
        organizationId,
        status: "ACTIVE",
        packKey: "franchise_qsr",
        teamSizeBracket: "MEDIUM",
        basePrice: PACK_PRICE.franchise_qsr,
        bracketPrice: TEAM_BRACKET.MEDIUM.monthly,
        currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      },
      select: { id: true },
    });
    subscriptionId = subscription.id;
    seeded = true;
  });

  afterAll(async () => {
    if (seeded) {
      // Cascades take the subscription, its lines and its invoices.
      await prisma.organization.delete({ where: { id: organizationId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("charges a pack as one line, not a discounted list of modules", async () => {
    if (!seeded) return;
    const lines = await intendedLines(organizationId);

    const pack = lines.find((l) => l.itemKey.startsWith("pack:"));
    expect(pack?.unitPrice).toBe(PACK_PRICE.franchise_qsr);
    // An invoice showing seven modules and a mystery discount row invites
    // "which module was the discount on?", which has no answer.
    expect(lines.some((l) => l.itemKey === PLATFORM_LINE)).toBe(false);
  });

  it("adds the team bracket as its own line", async () => {
    if (!seeded) return;
    const lines = await intendedLines(organizationId);
    const team = lines.find((l) => l.itemKey === TEAM_LINE);
    expect(team?.unitPrice).toBe(TEAM_BRACKET.MEDIUM.monthly);
  });

  it("projects a total equal to the sum of its lines", async () => {
    if (!seeded) return;
    const lines = await intendedLines(organizationId);
    const expected = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    expect(await projectedTotal(organizationId)).toBe(expected);
    expect(expected).toBe(PACK_PRICE.franchise_qsr + TEAM_BRACKET.MEDIUM.monthly);
  });

  it("opens the intended lines on first sync and nothing on the second", async () => {
    if (!seeded) return;

    const first = await syncSubscriptionLines(organizationId);
    expect(first.opened.length).toBeGreaterThan(0);

    // Idempotent: syncing an unchanged subscription must not churn its lines,
    // or every run would close and reopen them and the history becomes noise.
    const second = await syncSubscriptionLines(organizationId);
    expect(second.opened).toEqual([]);
    expect(second.closed).toEqual([]);
  });

  it("closes rather than deletes a line when the bracket changes", async () => {
    if (!seeded) return;

    const before = await prisma.subscriptionLine.count({ where: { subscriptionId } });

    await prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: { teamSizeBracket: "LARGE" },
    });
    const result = await syncSubscriptionLines(organizationId);

    expect(result.closed).toContain(TEAM_LINE);
    expect(result.opened).toContain(TEAM_LINE);

    // The old line survives, dated. Deleting it would make an invoice built
    // from it unexplainable.
    const after = await prisma.subscriptionLine.count({ where: { subscriptionId } });
    expect(after).toBeGreaterThan(before);

    const closedLine = await prisma.subscriptionLine.findFirst({
      where: { subscriptionId, itemKey: TEAM_LINE, activeTo: { not: null } },
      select: { unitPrice: true, activeTo: true },
    });
    expect(closedLine?.unitPrice).toBe(TEAM_BRACKET.MEDIUM.monthly);
    expect(closedLine?.activeTo).toBeInstanceOf(Date);
  });

  it("generates an invoice from the open lines", async () => {
    if (!seeded) return;
    const { start, end } = monthPeriod();

    const invoice = await generateInvoice(organizationId, start, end);
    expect(invoice).not.toBeNull();
    expect(invoice!.alreadyExisted).toBe(false);
    expect(invoice!.total).toBeGreaterThan(0);

    const lines = await prisma.platformInvoiceLine.findMany({
      where: { invoiceId: invoice!.invoiceId },
      select: { amount: true },
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.reduce((sum, l) => sum + l.amount, 0)).toBe(invoice!.total);
  });

  it("does not bill twice when the job runs twice", async () => {
    if (!seeded) return;
    const { start, end } = monthPeriod();

    const first = await generateInvoice(organizationId, start, end);
    const second = await generateInvoice(organizationId, start, end);

    expect(second!.invoiceId).toBe(first!.invoiceId);
    expect(second!.alreadyExisted).toBe(true);

    const count = await prisma.platformInvoice.count({
      where: { subscriptionId, periodStart: start },
    });
    expect(count).toBe(1);
  });

  it("survives two runs racing on the same period", async () => {
    if (!seeded) return;
    // The unique constraint is the real guarantee; the pre-read is a fast path.
    // Without the P2002 recovery this throws instead of returning the winner.
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    const { start, end } = monthPeriod(next);

    const [a, b] = await Promise.all([
      generateInvoice(organizationId, start, end),
      generateInvoice(organizationId, start, end),
    ]);

    expect(a!.invoiceId).toBe(b!.invoiceId);
    expect(
      await prisma.platformInvoice.count({ where: { subscriptionId, periodStart: start } }),
    ).toBe(1);
  });

  it("does not invoice a trial", async () => {
    if (!seeded) return;
    // A ₹0 bill for a free trial reads as a mistake.
    await prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: { status: "TRIAL" },
    });

    const later = new Date();
    later.setMonth(later.getMonth() + 6);
    const { start, end } = monthPeriod(later);

    expect(await generateInvoice(organizationId, start, end)).toBeNull();

    await prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: { status: "ACTIVE" },
    });
  });

  it("falls back to per-module lines with no pack", async () => {
    if (!seeded) return;
    await prisma.tenantSubscription.update({
      where: { id: subscriptionId },
      data: { packKey: null },
    });

    const lines = await intendedLines(organizationId);
    expect(lines.find((l) => l.itemKey === PLATFORM_LINE)?.unitPrice).toBe(PLATFORM_FEE);
    expect(lines.some((l) => l.itemKey.startsWith("pack:"))).toBe(false);
  });
});
