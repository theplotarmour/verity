import "server-only";

import prisma from "@/lib/prisma";

/**
 * Anomaly surfacing (R6).
 *
 * A cheap, deterministic scan that turns "something is off this week" into a
 * sentence the owner can read. Deliberately not a model on every metric: the
 * detection is arithmetic (a spike against the tenant's own recent baseline), and
 * the explanation is a plain-language template. The model, if configured, only
 * ever rephrases — it is never the thing that decides an anomaly is real, because
 * a hallucinated spike is a false alarm nobody can act on.
 *
 * Baseline is the tenant's own prior six days, so a busy restaurant and a quiet
 * salon each get judged against themselves, not a global number that fits neither.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** A spike has to clear both bars: enough in absolute terms, and enough above normal. */
const MIN_ABSOLUTE = 3;
const SPIKE_FACTOR = 2;
/** With no history to compare against, only an outright high count is worth a ping. */
const HIGH_WITHOUT_BASELINE = 5;

export interface AnomalySignal {
  kind: string;
  /** Human label, e.g. "Booking cancellations". */
  label: string;
  /** Count in the last 24h. */
  recent: number;
  /** Average per day across the prior baseline window. */
  baselineDaily: number;
}

export interface Anomaly {
  kind: string;
  severity: "info" | "warn";
  headline: string;
  detail: string;
}

/**
 * Decide whether one signal is anomalous, and phrase it. Pure — the whole reason
 * detection is testable without a database or a model.
 */
export function judgeSignal(signal: AnomalySignal): Anomaly | null {
  if (signal.recent < MIN_ABSOLUTE) return null;

  const noun = signal.label.toLowerCase();

  if (signal.baselineDaily <= 0) {
    // Nothing to compare against. Only flag an outright high count.
    if (signal.recent < HIGH_WITHOUT_BASELINE) return null;
    return {
      kind: signal.kind,
      severity: "warn",
      headline: `${signal.label} today`,
      detail: `${signal.recent} ${noun} in the last day, with little history to compare against — worth a look.`,
    };
  }

  const ratio = signal.recent / signal.baselineDaily;
  if (ratio < SPIKE_FACTOR) return null;

  const perDay = signal.baselineDaily >= 1
    ? `about ${Math.round(signal.baselineDaily)} a day`
    : `well under one a day`;

  return {
    kind: signal.kind,
    severity: ratio >= SPIKE_FACTOR * 2 ? "warn" : "info",
    headline: `${signal.label} up sharply`,
    detail: `${signal.recent} ${noun} in the last day, versus ${perDay} normally — roughly ${ratio.toFixed(1)}× the usual rate.`,
  };
}

/** Count in [from, to). */
async function countCancelledAppointments(factoryId: string, from: Date, to: Date) {
  return prisma.appointment.count({
    where: { factoryId, status: "CANCELLED", updatedAt: { gte: from, lt: to } },
  });
}

async function countCancelledOrders(factoryId: string, from: Date, to: Date) {
  return prisma.diningOrder.count({
    where: { factoryId, state: "CANCELLED", updatedAt: { gte: from, lt: to } },
  });
}

/**
 * Gather this tenant's signals and judge them. A factory without the booking or
 * dining modules simply has zero of those events, so no anomaly is raised — no
 * entitlement gate is needed, only the absence of data.
 */
export async function scanFactoryAnomalies(factoryId: string, now: Date = new Date()): Promise<Anomaly[]> {
  const recentFrom = new Date(now.getTime() - DAY_MS);
  const baselineFrom = new Date(now.getTime() - 7 * DAY_MS);

  const [bookingRecent, bookingPrior, orderRecent, orderPrior] = await Promise.all([
    countCancelledAppointments(factoryId, recentFrom, now),
    countCancelledAppointments(factoryId, baselineFrom, recentFrom),
    countCancelledOrders(factoryId, recentFrom, now),
    countCancelledOrders(factoryId, baselineFrom, recentFrom),
  ]);

  const signals: AnomalySignal[] = [
    {
      kind: "booking_cancellations",
      label: "Booking cancellations",
      recent: bookingRecent,
      baselineDaily: bookingPrior / 6,
    },
    {
      kind: "order_cancellations",
      label: "Order cancellations",
      recent: orderRecent,
      baselineDaily: orderPrior / 6,
    },
  ];

  return signals.flatMap((s) => {
    const anomaly = judgeSignal(s);
    return anomaly ? [anomaly] : [];
  });
}
