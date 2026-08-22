import { cronAuthorized, cronUnauthorized } from "@/lib/server/cron-auth";
import { runSubscriptionLifecycle } from "@/platform/billing/lifecycle";

/**
 * GET /api/cron/subscriptions — the daily subscription pass.
 *
 * Expires trials that have run out, freezes subscriptions with an unpaid
 * invoice, and warns read-only workspaces that have reached their retention
 * window. It never deletes.
 *
 * Guarded by `CRON_SECRET` with a constant-time comparison, and **fails closed**
 * when the secret is unset — an unauthenticated version of this endpoint would
 * let anyone freeze every tenant on the platform.
 *
 * Configure in vercel.json:
 *   { "path": "/api/cron/subscriptions", "schedule": "0 2 * * *" }
 *
 * 02:00 rather than midnight: a trial created at 09:00 on day 0 expires early on
 * day 8 rather than fifteen hours into day 7, so nobody loses access to a day
 * they were promised.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return cronUnauthorized();

  try {
    const report = await runSubscriptionLifecycle();

    return Response.json({
      ok: true,
      trialsExpired: report.trialsExpired.length,
      lapsed: report.lapsed.length,
      deletionWarnings: report.deletionWarnings.length,
      nudgesDue: report.nudgesDue.length,
    });
  } catch (error) {
    // Logged in full, reported generically. A cron's response body is not a
    // place to leak constraint text, and the 500 is what makes the failure
    // visible in Vercel's cron log.
    console.error("[cron/subscriptions]", error);
    return Response.json({ error: "Lifecycle pass failed." }, { status: 500 });
  }
}
