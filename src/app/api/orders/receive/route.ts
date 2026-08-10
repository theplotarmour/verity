import { createHash } from "node:crypto";
import { after } from "next/server";

import prisma from "@/lib/prisma";
import { authenticateApiRequest, touchApiKey } from "@/lib/server/api-keys";
import { drainWebhooks } from "@/lib/webhooks/outbox";
import { ingestExternalOrder, type IngestOrderInput } from "@/server/internal/orderIngest";

/**
 * POST /api/orders/receive — the headless order intake.
 *
 * This is the one endpoint in the application that writes production work
 * without a signed-in human, so it is the one that most has to be got right.
 * Four things stand between the internet and the shop floor:
 *
 *  1. a bearer token, stored hashed, matched in constant time;
 *  2. an HMAC over the raw body with a separate secret, so a leaked token is not
 *     sufficient and a captured request cannot be replayed with edits;
 *  3. the tenant read from the key row — never from the payload, because a body
 *     that names a factory is a body asking to write into someone else's;
 *  4. an idempotency record, because every sane sender retries on timeout and a
 *     timeout is exactly when the write most likely did land.
 *
 * Orders arrive in DRAFT. An external storefront proposes work; a person here
 * releases it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status: number) {
  return Response.json(body, { status });
}

/** Shape validation. Returns the first problem rather than a list — a caller fixing an integration wants one thing to fix at a time. */
function validate(body: unknown): { ok: true; input: IngestOrderInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be a JSON object." };
  const b = body as Record<string, unknown>;

  const customer = b.customer as Record<string, unknown> | undefined;
  const name = typeof customer?.name === "string" ? customer.name.trim() : "";
  if (!name) return { ok: false, error: "customer.name is required." };

  if (!Array.isArray(b.lines) || b.lines.length === 0) {
    return { ok: false, error: "At least one line is required." };
  }
  if (b.lines.length > 200) {
    return { ok: false, error: "Too many lines in one order (max 200)." };
  }

  const lines = [];
  for (const raw of b.lines as Record<string, unknown>[]) {
    const quantity = Number(raw?.quantity);
    // Guard the whole class at once: NaN, 0, negatives and fractional counts are
    // all things that produce a job card nobody can complete.
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
      return { ok: false, error: "Every line needs a positive whole-number quantity." };
    }
    if (quantity > 100_000) return { ok: false, error: "Line quantity is implausibly large." };
    lines.push({
      quantity,
      sku: typeof raw.sku === "string" ? raw.sku : null,
      itemId: typeof raw.itemId === "string" ? raw.itemId : null,
      unitPrice: Number.isFinite(Number(raw.unitPrice)) ? Number(raw.unitPrice) : null,
    });
  }

  const orderType = b.orderType;
  if (
    orderType !== undefined &&
    !["RETAIL", "DEALER", "OEM", "INTERNAL"].includes(String(orderType))
  ) {
    return { ok: false, error: "orderType must be RETAIL, DEALER, OEM or INTERNAL." };
  }

  const vehicle = (b.vehicle ?? {}) as Record<string, unknown>;
  const spec = (b.spec ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  return {
    ok: true,
    input: {
      externalId: str(b.externalId),
      customer: { name, phone: str(customer?.phone) },
      orderType: orderType as IngestOrderInput["orderType"],
      expectedDeliveryDate: str(b.expectedDeliveryDate),
      remarks: str(b.remarks),
      vehicle: { brand: str(vehicle.brand), model: str(vehicle.model), year: str(vehicle.year) },
      spec: {
        material: str(spec.material),
        design: str(spec.design),
        colour: str(spec.colour),
        seatType: str(spec.seatType),
        hasArmrest: typeof spec.hasArmrest === "boolean" ? spec.hasArmrest : null,
        headrestCount: Number.isFinite(Number(spec.headrestCount))
          ? Number(spec.headrestCount)
          : null,
      },
      lines,
    },
  };
}

export async function POST(request: Request) {
  // The exact bytes received. Re-serialising parsed JSON produces different
  // bytes — key order, whitespace, number formatting — and every signature would
  // fail for a reason nobody could debug.
  const rawBody = await request.text();

  if (rawBody.length > 512 * 1024) {
    return json({ error: "Payload too large." }, 413);
  }

  const auth = await authenticateApiRequest(request.headers, rawBody);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return json({ error: "Body is not valid JSON." }, 400);
  }

  const checked = validate(parsed);
  if (!checked.ok) return json({ error: checked.error }, 422);

  // A caller that does not send a key still gets protection: an identical body
  // replayed within the retention window is treated as the same request. That
  // is weaker than a real key — two genuinely identical orders collapse into one
  // — but silently duplicating production work is the worse failure.
  const idempotencyKey =
    request.headers.get("idempotency-key")?.trim() ||
    `body:${createHash("sha256").update(rawBody).digest("hex")}`;

  const seen = await prisma.ingestRequest.findUnique({
    where: { factoryId_idempotencyKey: { factoryId: auth.factoryId, idempotencyKey } },
    select: { status: true, response: true },
  });
  if (seen) {
    // Replay the original answer verbatim, so a retry sees the same order id it
    // would have seen the first time.
    return Response.json(seen.response, {
      status: seen.status,
      headers: { "x-verity-idempotent-replay": "true" },
    });
  }

  try {
    const result = await ingestExternalOrder(auth.factoryId, checked.input);
    const body = { ok: true as const, ...result };

    // Recorded after the work, so a crash mid-ingest leaves the key unclaimed
    // and the sender's retry actually retries. The unique constraint is what
    // makes two simultaneous retries safe.
    await prisma.ingestRequest
      .create({
        data: {
          factoryId: auth.factoryId,
          apiKeyId: auth.apiKeyId,
          idempotencyKey,
          status: 201,
          response: body,
          salesOrderId: result.salesOrderId,
        },
      })
      .catch(() => undefined);

    after(async () => {
      await touchApiKey(auth.apiKeyId);
      // Deliver now rather than waiting for the cron. after() runs once the
      // response is sent, so this costs the caller nothing — and the outbox row
      // is already committed, so a failure here delays delivery rather than
      // losing it.
      await drainWebhooks().catch(() => undefined);
    });

    return json(body, 201);
  } catch (error) {
    // Deliberately not echoed to the caller: the message can carry column names
    // and constraint text. Logged in full, returned as a generic failure.
    console.error("[orders/receive] ingest failed", error);
    return json({ error: "Could not book the order." }, 500);
  }
}
