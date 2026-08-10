import { timingSafeEqual } from "node:crypto";

import { drainWebhooks } from "@/lib/webhooks/outbox";

/**
 * The retry path for the webhook outbox.
 *
 * `after()` on the originating request handles the happy case. This handles
 * everything else: the receiver was down, the process died holding a claim, the
 * function was frozen before delivery finished. Without a cron hitting this, a
 * first-attempt failure is a permanent one — the row sits PENDING forever and
 * the outbox is just a table of things that never got sent.
 *
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/webhooks/drain", "schedule": "*\/5 * * * *" }] }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;

  // Fail closed. An unset secret leaves an unauthenticated endpoint that fires
  // outbound requests on demand, which is a usable amplifier even though it
  // cannot choose the target.
  if (!expected) return false;

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await drainWebhooks(50);
  return Response.json({ ok: true, ...result });
}
