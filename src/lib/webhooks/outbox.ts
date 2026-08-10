import "server-only";

import { createHmac } from "node:crypto";

import prisma from "@/lib/prisma";
import { assertDeliverable } from "./url-guard";

/**
 * Durable webhook delivery.
 *
 * There is no worker process here. On Vercel the function is frozen the moment
 * it returns, so a fire-and-forget `fetch(...)` after the response is killed
 * mid-flight — and silently: the external system simply never hears that the
 * order shipped, and nothing anywhere records that it didn't.
 *
 * So the intent is written to the database first, inside the same transaction as
 * the thing that caused it. Delivery is a separate, retryable step. If the
 * process dies between the two, the row is still there and the drain picks it
 * up; if delivery fails, `attempts` and `nextAttemptAt` back it off rather than
 * dropping it.
 *
 *   enqueue()  — inside the business transaction, cheap, never fails the caller
 *   drain()    — after() on the same request, and again from a cron
 */

export const WEBHOOK_EVENTS = [
  "ORDER_RECEIVED",
  "ORDER_COMMITTED",
  "ORDER_QC_PASSED",
  "ORDER_DISPATCHED",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Attempts before a delivery is abandoned. ~1h of retries. */
const MAX_ATTEMPTS = 6;
/** How long a claimed row may sit in DELIVERING before another drain retakes it. */
const CLAIM_TIMEOUT_MS = 2 * 60 * 1000;

/** Exponential, capped. Attempt 1 waits a minute; attempt 6 waits half an hour. */
function backoffMs(attempts: number): number {
  return Math.min(60_000 * 2 ** (attempts - 1), 30 * 60_000);
}

type Client = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Record that a webhook is owed. Call inside the transaction that made it true.
 *
 * Writes one row per subscribed endpoint rather than one per event, so a
 * failure to reach endpoint A cannot hold up endpoint B.
 */
export async function enqueueWebhook(
  tx: Client,
  factoryId: string,
  event: WebhookEvent,
  payload: unknown,
): Promise<number> {
  const endpoints = await tx.webhookEndpoint.findMany({
    where: { factoryId, isActive: true },
    select: { id: true, events: true },
  });

  // An endpoint with no events listed wants all of them — the useful default,
  // since the common case is one receiver for the whole integration.
  const subscribed = endpoints.filter((e) => e.events.length === 0 || e.events.includes(event));
  if (subscribed.length === 0) return 0;

  await tx.webhookDelivery.createMany({
    data: subscribed.map((endpoint) => ({
      factoryId,
      endpointId: endpoint.id,
      event,
      payload: payload as never,
    })),
  });

  return subscribed.length;
}

async function deliverOne(delivery: {
  id: string;
  event: string;
  payload: unknown;
  attempts: number;
  endpoint: { url: string; secret: string };
}): Promise<void> {
  const attempt = delivery.attempts + 1;

  const fail = async (lastError: string, lastStatus?: number) => {
    const exhausted = attempt >= MAX_ATTEMPTS;
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? "FAILED" : "PENDING",
        attempts: attempt,
        nextAttemptAt: new Date(Date.now() + backoffMs(attempt)),
        lastError: lastError.slice(0, 500),
        lastStatus: lastStatus ?? null,
      },
    });
  };

  // Re-checked here, not just when the endpoint was saved: DNS can be repointed
  // at a private address in between, which is the whole point of rebinding.
  const verdict = await assertDeliverable(delivery.endpoint.url);
  if (!verdict.ok) {
    await fail(`Refused: ${verdict.reason}`);
    return;
  }

  const body = JSON.stringify({
    event: delivery.event,
    deliveryId: delivery.id,
    sentAt: new Date().toISOString(),
    data: delivery.payload,
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", delivery.endpoint.secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  try {
    const response = await fetch(verdict.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-verity-event": delivery.event,
        "x-verity-delivery": delivery.id,
        "x-verity-timestamp": timestamp,
        "x-verity-signature": signature,
      },
      body,
      redirect: "manual", // a 302 to 169.254.169.254 would bypass every check above
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      await fail(`HTTP ${response.status}`, response.status);
      return;
    }

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "DELIVERED",
        attempts: attempt,
        deliveredAt: new Date(),
        lastStatus: response.status,
        lastError: null,
      },
    });
  } catch (error) {
    await fail(error instanceof Error ? error.message : "Delivery failed");
  }
}

/**
 * Attempt the deliveries that are due.
 *
 * Called from `after()` on the request that enqueued — so the common case is
 * delivered within a second — and from a cron, which is what actually makes it
 * durable when the first attempt fails or the process dies.
 *
 * Claiming is a two-step compare-and-set on `status`: rows are marked
 * DELIVERING before being worked, so two overlapping drains cannot both send
 * the same delivery. A row stuck in DELIVERING past `CLAIM_TIMEOUT_MS` is
 * reclaimed, since the only way to reach that state is a process that died
 * holding it.
 */
export async function drainWebhooks(limit = 20): Promise<{ attempted: number }> {
  const staleBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS);

  const candidates = await prisma.webhookDelivery.findMany({
    where: {
      nextAttemptAt: { lte: new Date() },
      OR: [{ status: "PENDING" }, { status: "DELIVERING", updatedAt: { lt: staleBefore } }],
    },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    select: {
      id: true,
      event: true,
      payload: true,
      attempts: true,
      status: true,
      endpoint: { select: { url: true, secret: true } },
    },
  });

  let attempted = 0;

  for (const candidate of candidates) {
    // Claim it. The status in the WHERE is what makes this atomic: a second
    // drain that got the same row finds zero rows to update and skips it.
    const claimed = await prisma.webhookDelivery.updateMany({
      where: { id: candidate.id, status: candidate.status },
      data: { status: "DELIVERING" },
    });
    if (claimed.count === 0) continue;

    attempted++;
    await deliverOne(candidate);
  }

  return { attempted };
}
