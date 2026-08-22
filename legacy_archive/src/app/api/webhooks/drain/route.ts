import { drainWebhooks } from "@/lib/webhooks/outbox";
import { cronAuthorized, cronUnauthorized } from "@/lib/server/cron-auth";

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


export async function GET(request: Request) {
  if (!cronAuthorized(request)) return cronUnauthorized();

  const result = await drainWebhooks(50);
  return Response.json({ ok: true, ...result });
}
