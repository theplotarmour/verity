import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDueWork, type ScheduleCadence } from "@/server/platform/contribution";
import { prisma } from "@/server/platform/db";
import { withTenant } from "@/server/platform/tenancy";
import { installCapabilities } from "@/server/capabilities/registry";
import { installAdministration } from "@/server/platform/administration";
import { readCronSecret } from "@/server/platform/config";

export const dynamic = "force-dynamic";

/**
 * The trigger for scheduled work.
 *
 * Authority: ADR-015. Kent's is the requirement that made binding a provider
 * legitimate — SLA prep clocks are correct and nothing was sweeping them, so a
 * manager was never told food was late while it was still late.
 *
 * This is the smallest thing that turns a finished contract into behaviour: the
 * deployment host calls this route on a schedule, and it invokes the same
 * `runDueWork` the capability probe exercised. No vendor, no dependency, no
 * queue. Replacing it with a worker or a managed scheduler later changes
 * nothing a capability can see, which is the property the cadence abstraction
 * was built to have.
 *
 * THE CALLER NAMES THE TENANT, OR ASKS FOR ALL OF THEM
 * `?tenant=<uuid>` runs one tenant. `?tenant=all` enumerates, which ADR-016
 * decides and which this route previously refused to do on its own authority.
 *
 * What forced that decision was not a client count. A tenant id is runtime data
 * — tenants are created in the HQ console with generated UUIDs — while a cron
 * schedule is static configuration written at build time, so a per-tenant
 * schedule is unwritable rather than merely verbose, and every new client would
 * need a redeploy before any of its deadlines fired.
 *
 * Enumeration returns IDS ONLY, from a function whose whole body is a distinct
 * select over active activations. The work for each tenant then runs inside
 * `withTenant` exactly as the single-tenant path does — nothing crosses the
 * boundary, and there is no privileged path around tenancy anywhere here.
 */

/**
 * Constant-time comparison.
 *
 * A plain `===` on a secret leaks its length and, byte by byte, its content to
 * anyone patient enough to measure. The comparison is cheap; the alternative is
 * a timing oracle on the one credential this route has.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function dispatch(request: Request): Promise<NextResponse> {
  const expected = readCronSecret();
  if (!expected) {
    // Refuse rather than run unauthenticated. A scheduler endpoint with no
    // secret is a way to make the platform do work on demand from outside, and
    // "the variable was missing" is not a reason to become that.
    return NextResponse.json({ error: "scheduled work is not configured" }, { status: 503 });
  }

  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secretMatches(provided, expected)) {
    // Deliberately identical to the shape returned for a missing tenant: an
    // attacker learns nothing about which half they got wrong.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("tenant");
  const cadence = (url.searchParams.get("cadence") ?? "frequent") as ScheduleCadence;

  const everyTenant = requested === "all";
  if (!everyTenant && (!requested || !/^[0-9a-f-]{36}$/i.test(requested))) {
    return NextResponse.json({ error: "a tenant is required" }, { status: 400 });
  }
  if (!["frequent", "hourly", "daily", "weekly"].includes(cadence)) {
    return NextResponse.json({ error: "unknown cadence" }, { status: 400 });
  }

  installCapabilities();
  installAdministration();

  const tenantIds = everyTenant ? await schedulerTenantIds() : [requested!];

  // Sequential, not parallel. Fanning out would multiply concurrent database
  // connections by the tenant count against a pooled database — ADR-016 records
  // that a slow tenant delays the ones after it, and that a queue is the answer
  // when that becomes the constraint rather than a prediction.
  const results = [];
  for (const tenantId of tenantIds) {
    results.push(await runForTenant(tenantId, cadence));
  }

  return NextResponse.json({
    cadence,
    tenants: results.length,
    ran: results.reduce((sum, result) => sum + result.ran, 0),
    results,
  });
}

/**
 * Ids of tenants with something to run (ADR-016).
 *
 * A named SECURITY DEFINER function rather than a direct read of the `tenant`
 * table: the latter would work only because the runtime role happens to see that
 * table, which is the kind of accident that makes an isolation boundary depend on
 * nobody noticing. A function with a stated purpose can be reviewed, granted and
 * revoked.
 */
async function schedulerTenantIds(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ tenant_id: string }[]>`
    SELECT tenant_id FROM verity.scheduler_tenant_ids()`;
  return rows.map((row) => row.tenant_id);
}

/** One tenant's due work, entirely inside that tenant's own scope. */
async function runForTenant(tenantId: string, cadence: ScheduleCadence) {
  // Which capabilities are active is read inside the tenant's own scope, under
  // its own policies. There is no privileged path around tenancy here, and
  // `runDueWork` runs each unit under `withTenant` for the same reason.
  const activeCapabilityIds = await withTenant(tenantId, async (tx) => {
    const activations = await tx.tenantActivation.findMany({
      where: { status: "Active" },
      select: { capabilityId: true },
    });
    return activations.map((activation) => activation.capabilityId);
  });

  const outcomes = await runDueWork({ tenantId, activeCapabilityIds, cadence });

  return {
    tenantId,
    ran: outcomes.length,
    outcomes: outcomes.map((outcome) => ({
      key: outcome.key,
      status: outcome.status,
      events: outcome.events,
      ms: outcome.ms,
      // The error text is returned to the SCHEDULER, which is authenticated and
      // is the only thing that can act on a failed unit. It reaches no browser.
      error: outcome.error,
    })),
  };
}

/**
 * Vercel Cron issues a GET and sets `Authorization: Bearer $CRON_SECRET` itself,
 * so GET is the shape the deployment host actually calls. POST is kept because a
 * trigger that is a mutation reads honestly, and because a worker or a managed
 * scheduler put in front of this later will reach for it.
 *
 * Both run the same code and both require the same secret. GET is not a weaker
 * door.
 */
export async function GET(request: Request): Promise<NextResponse> {
  return dispatch(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return dispatch(request);
}
