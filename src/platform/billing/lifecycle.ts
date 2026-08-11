import "server-only";

import prisma from "@/lib/prisma";
import { TRIAL } from "@/platform/pricing";

/**
 * Moving subscriptions through their states.
 *
 * Separated from the route so it can be tested without a request and a
 * `CRON_SECRET`. The route is authentication and a JSON response; the decisions
 * are here.
 *
 * One rule governs the whole file: **nothing here deletes anything.** The
 * deletion warning is automatic; the deletion is a human with a reason. A cron
 * that drops a workspace is one bad date comparison away from dropping a paying
 * one, and that mistake is unrecoverable in a way a missed email is not.
 */

export interface LifecycleReport {
  /** Trials that ran out and are now read-only. */
  trialsExpired: string[];
  /** Paying subscriptions that lapsed and are now read-only. */
  lapsed: string[];
  /** Read-only workspaces past their retention window, warned not deleted. */
  deletionWarnings: string[];
  /** Trials at the nudge point, for the assistant to raise. */
  nudgesDue: string[];
}

/**
 * A day before `now`, in whole days.
 *
 * Used for the retention window rather than a millisecond comparison, so a job
 * running a few minutes late does not warn a day early.
 */
function daysAgo(days: number, now: Date): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

/**
 * Run one pass of the subscription lifecycle.
 *
 * `now` is injectable so the tests can advance time without waiting seven days.
 * Idempotent: every transition is filtered on the state it moves *from*, so a
 * second run in the same minute finds nothing to do.
 */
export async function runSubscriptionLifecycle(now = new Date()): Promise<LifecycleReport> {
  const report: LifecycleReport = {
    trialsExpired: [],
    lapsed: [],
    deletionWarnings: [],
    nudgesDue: [],
  };

  // ---------------------------------------------------------------------------
  // Trials that have run out.
  //
  // `readOnlySince` is set here, and the retention clock counts from it rather
  // than from trialEndsAt. That matters for the lapsed case below, where a
  // tenant who paid for six months must get their full 30 days from the moment
  // they actually lost write access.
  // ---------------------------------------------------------------------------
  const expiredTrials = await prisma.tenantSubscription.findMany({
    where: { status: "TRIAL", trialEndsAt: { not: null, lte: now } },
    select: { id: true, organizationId: true },
  });

  for (const subscription of expiredTrials) {
    await prisma.tenantSubscription.update({
      where: { id: subscription.id },
      data: { status: "TRIAL_EXPIRED", readOnlySince: now },
    });
    report.trialsExpired.push(subscription.organizationId);
    await notifyOrganization(
      subscription.organizationId,
      "Trial ended",
      "Your workspace is now read-only. Nothing has been deleted — activate billing to make changes again.",
    );
  }

  // ---------------------------------------------------------------------------
  // Paying subscriptions with an unpaid invoice past its period.
  //
  // Deliberately keyed on an issued-and-unpaid invoice rather than on a date
  // arithmetic guess about when payment was due. An invoice that was never
  // issued is our failure, not the tenant's, and freezing them for it would be
  // indefensible.
  // ---------------------------------------------------------------------------
  const overdue = await prisma.platformInvoice.findMany({
    where: {
      status: "ISSUED",
      paidAt: null,
      periodEnd: { lt: now },
      subscription: { status: "ACTIVE" },
    },
    select: { subscriptionId: true, subscription: { select: { organizationId: true } } },
    distinct: ["subscriptionId"],
  });

  for (const invoice of overdue) {
    await prisma.tenantSubscription.update({
      where: { id: invoice.subscriptionId },
      data: { status: "READ_ONLY", readOnlySince: now },
    });
    report.lapsed.push(invoice.subscription.organizationId);
    await notifyOrganization(
      invoice.subscription.organizationId,
      "Payment outstanding",
      "Your workspace is read-only until the outstanding invoice is settled. Your data is intact.",
    );
  }

  // ---------------------------------------------------------------------------
  // Retention window reached. **Warn only.**
  // ---------------------------------------------------------------------------
  const retentionCutoff = daysAgo(TRIAL.readOnlyRetentionDays, now);
  const forWarning = await prisma.tenantSubscription.findMany({
    where: {
      status: { in: ["TRIAL_EXPIRED", "READ_ONLY"] },
      readOnlySince: { not: null, lte: retentionCutoff },
    },
    select: { id: true, organizationId: true },
  });

  for (const subscription of forWarning) {
    report.deletionWarnings.push(subscription.organizationId);
    await notifyOrganization(
      subscription.organizationId,
      "Data retention notice",
      `This workspace has been read-only for ${TRIAL.readOnlyRetentionDays} days. ` +
        "Contact us to reactivate it before the data is scheduled for removal.",
    );
  }

  // ---------------------------------------------------------------------------
  // Nudges. Reported rather than sent — the assistant raises it in conversation
  // (PRD 02 R8), which lands better than a system email and can quote the
  // tenant's actual configuration and price.
  // ---------------------------------------------------------------------------
  const nudgeAfter = new Date(now);
  nudgeAfter.setDate(nudgeAfter.getDate() + (TRIAL.days - TRIAL.nudgeOnDay));

  const nudging = await prisma.tenantSubscription.findMany({
    where: { status: "TRIAL", trialEndsAt: { not: null, gt: now, lte: nudgeAfter } },
    select: { organizationId: true },
  });
  report.nudgesDue = nudging.map((s) => s.organizationId);

  return report;
}

/**
 * Notify a tenant's owners.
 *
 * `Notification` is factory-scoped while subscriptions are organisation-scoped,
 * so this fans out to the owners of every factory in the org. Failures are
 * swallowed: a notification that cannot be written must not stop the state
 * transition, or a tenant stays writable because their mailbox row failed.
 */
async function notifyOrganization(
  organizationId: string,
  title: string,
  message: string,
): Promise<void> {
  try {
    const owners = await prisma.user.findMany({
      where: {
        factory: { organizationId },
        role: { in: ["OWNER", "CO_OWNER"] },
        isActive: true,
      },
      select: { id: true, factoryId: true },
    });
    if (owners.length === 0) return;

    await prisma.notification.createMany({
      data: owners.map((owner) => ({
        factoryId: owner.factoryId,
        userId: owner.id,
        title,
        message,
        // ACTION_REQUIRED rather than a new BILLING type. Every notification
        // this file sends needs the tenant to *do* something, and the existing
        // enum already says that — adding a value would mean a migration and a
        // second styling branch for no extra meaning.
        type: "ACTION_REQUIRED" as const,
        linkUrl: "/owner/settings/billing",
      })),
    });
  } catch {
    // Deliberately silent. See the note above.
  }
}
