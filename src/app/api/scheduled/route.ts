import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDueWork, type ScheduleCadence } from "@/server/platform/contribution";
import { withTenant } from "@/server/platform/tenancy";
import { installCapabilities } from "@/server/capabilities/registry";
import { installAdministration } from "@/server/platform/administration";

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
 * ONE TENANT PER CALL, DELIBERATELY
 * The caller names the tenant. Enumerating tenants here would be a cross-tenant
 * read, and ADR-013 lists exactly three of those — adding a fourth is a
 * deliberate act with its own decision, not something a cron endpoint does on
 * the way past. One schedule entry per client is honest at Kent's scale; when
 * there are enough clients for that to hurt, that is the requirement that
 * forces the enumeration decision, and it can be answered then with the real
 * number in hand.
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

export async function POST(request: Request): Promise<NextResponse> {
  const expected = process.env.CRON_SECRET;
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
  const tenantId = url.searchParams.get("tenant");
  const cadence = (url.searchParams.get("cadence") ?? "frequent") as ScheduleCadence;

  if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId)) {
    return NextResponse.json({ error: "a tenant is required" }, { status: 400 });
  }
  if (!["frequent", "hourly", "daily", "weekly"].includes(cadence)) {
    return NextResponse.json({ error: "unknown cadence" }, { status: 400 });
  }

  installCapabilities();
  installAdministration();

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

  return NextResponse.json({
    tenantId,
    cadence,
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
  });
}
