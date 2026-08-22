import { createHash } from "node:crypto";
import { after } from "next/server";

import prisma from "@/lib/prisma";
import { verifyShopifySignature } from "@/lib/api-keys/signing";
import { drainWebhooks } from "@/lib/webhooks/outbox";
import { ingestExternalOrder } from "@/server/internal/orderIngest";
import { mapShopifyOrder } from "@/server/internal/shopifyOrder";

/**
 * POST /api/integrations/shopify — Shopify's `orders/create` webhook.
 *
 * A thin adapter over the same ingest path `/api/orders/receive` uses. It maps
 * Shopify's payload and nothing else: the booking logic, the tenant scoping and
 * the idempotency record are shared, so an order from Shopify and the same
 * order typed by hand cannot diverge.
 *
 * Identifying the tenant is the awkward part. Shopify webhooks carry no bearer
 * token and no custom headers — the only caller identity is
 * `X-Shopify-Shop-Domain`. So a tenant registers their shop domain against an
 * API key, and that key's `signingSecret` holds the Shopify webhook secret. The
 * domain names the tenant; the HMAC proves it is really Shopify.
 *
 * Setup, in Shopify: Settings → Notifications → Webhooks → `Order creation`,
 * pointing at this URL. Copy the signing secret Shopify shows into the key.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Always 200 on a *handled* request, including business-level rejections.
 *
 * Shopify retries a non-2xx for 48 hours and then disables the webhook
 * entirely. An order we cannot map is not going to map on the ninth retry, and
 * having the whole integration switched off because one order had no line items
 * is a far worse outcome than dropping that order with a logged reason. Genuine
 * auth failures still return 401 — those should be loud.
 */
function handled(body: Record<string, unknown>) {
  return Response.json(body, { status: 200 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (rawBody.length > 1024 * 1024) {
    return Response.json({ error: "Payload too large." }, { status: 413 });
  }

  const shopDomain = request.headers.get("x-shopify-shop-domain")?.trim().toLowerCase() ?? "";
  const signature = request.headers.get("x-shopify-hmac-sha256") ?? "";

  if (!shopDomain) {
    return Response.json({ error: "Missing X-Shopify-Shop-Domain." }, { status: 401 });
  }

  const key = await prisma.apiKey.findUnique({
    where: { externalDomain: shopDomain },
    select: { id: true, factoryId: true, signingSecret: true, revokedAt: true },
  });

  // Same response for "no such shop" and "revoked", for the same reason as the
  // bearer path: the difference tells an attacker which guess was once real.
  if (!key || key.revokedAt) {
    return Response.json({ error: "Unknown or revoked shop." }, { status: 401 });
  }

  if (!verifyShopifySignature({ secret: key.signingSecret, signature, rawBody })) {
    return Response.json({ error: "Signature verification failed." }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return handled({ ok: false, reason: "Body is not valid JSON." });
  }

  const mapped = mapShopifyOrder(parsed);
  if ("error" in mapped) {
    console.warn(`[shopify] ${shopDomain}: ${mapped.error}`);
    return handled({ ok: false, reason: mapped.error });
  }

  /*
   * Idempotency.
   *
   * Shopify sends `X-Shopify-Webhook-Id`, but it is *per delivery attempt* in
   * some versions rather than per event — so keying on it alone would let a
   * retry create a second order. The Shopify order id is the stable identity of
   * the thing being booked, so that is what the key is built from, falling back
   * to a body hash.
   */
  const idempotencyKey = mapped.externalId
    ? `shopify:${shopDomain}:${mapped.externalId}`
    : `shopify:${shopDomain}:body:${createHash("sha256").update(rawBody).digest("hex")}`;

  const seen = await prisma.ingestRequest.findUnique({
    where: { factoryId_idempotencyKey: { factoryId: key.factoryId, idempotencyKey } },
    select: { status: true, response: true },
  });
  if (seen) {
    return Response.json(seen.response, {
      status: 200,
      headers: { "x-verity-idempotent-replay": "true" },
    });
  }

  try {
    const result = await ingestExternalOrder(key.factoryId, mapped);

    await prisma.ingestRequest
      .create({
        data: {
          factoryId: key.factoryId,
          apiKeyId: key.id,
          idempotencyKey,
          status: 200,
          response: { ok: true, ...result },
          salesOrderId: result.salesOrderId,
        },
      })
      .catch(() => undefined);

    after(async () => {
      await prisma.apiKey
        .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
        .catch(() => undefined);
      await drainWebhooks().catch(() => undefined);
    });

    return handled({ ok: true, ...result });
  } catch (error) {
    // A 500 here *is* worth a Shopify retry — the order was not booked and the
    // cause is likely transient.
    console.error(`[shopify] ${shopDomain} ingest failed`, error);
    return Response.json({ error: "Could not book the order." }, { status: 500 });
  }
}
