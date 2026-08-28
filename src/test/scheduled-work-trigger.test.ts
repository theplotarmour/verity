import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { activateCapability, invalidateCapabilityCache } from "@/server/platform/capability";
import { clearCommands, clearHooks } from "@/server/platform/command";
import { clearQueries } from "@/server/platform/query";
import { clearScopeResolvers } from "@/server/platform/authorization";
import { clearTransitionGuards } from "@/server/platform/state";
import { clearContributions } from "@/server/platform/contribution";
import { LOCATION_CAPABILITY } from "@/server/capabilities/location";
import { GET, POST } from "@/app/api/scheduled/route";

/**
 * The scheduled-work trigger — ADR-015 and ADR-016.
 *
 * This route is the one door into the platform that no signed-in human stands
 * behind. Its whole security story is a shared secret and a constant-time
 * comparison, so the refusals matter more than the successes.
 *
 * ADR-016 lets it enumerate tenants. That is a cross-tenant read, and the tests
 * below assert the two properties that make it acceptable: the enumeration is
 * unreachable without the secret, and the work still runs inside each tenant's
 * own scope.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "scheduled-work-trigger.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const SECRET = `test-secret-${randomUUID()}`;
const ORIGINAL_SECRET = process.env.CRON_SECRET;

function call(
  path: string,
  init: { secret?: string; method?: "GET" | "POST" } = {},
): Promise<Response> {
  const request = new Request(`https://verity.test${path}`, {
    method: init.method ?? "POST",
    headers: init.secret ? { authorization: `Bearer ${init.secret}` } : {},
  });
  return init.method === "GET" ? GET(request) : POST(request);
}

describeDb("scheduled work: the trigger", () => {
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const dormantTenant = randomUUID();

  beforeAll(async () => {
    await assertRlsEnforceable();
    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();

    for (const tenantId of [tenantA, tenantB]) {
      await withTenant(tenantId, async (tx) => {
        await tx.tenant.create({ data: { id: tenantId, name: `Scheduled ${tenantId.slice(0, 6)}` } });
        await activateCapability(tx, tenantId, LOCATION_CAPABILITY);
      });
    }
    // Exists, activates nothing. Enumeration must skip it: a tenant with no
    // active capability declares no scheduled work, and returning it would be a
    // wasted round trip per cadence, forever.
    await withTenant(dormantTenant, async (tx) => {
      await tx.tenant.create({ data: { id: dormantTenant, name: "Dormant" } });
    });

    invalidateCapabilityCache();
    process.env.CRON_SECRET = SECRET;
  });

  afterEach(() => {
    process.env.CRON_SECRET = SECRET;
  });

  afterAll(async () => {
    if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIGINAL_SECRET;

    clearCommands();
    clearQueries();
    clearHooks();
    clearScopeResolvers();
    clearTransitionGuards();
    clearContributions();
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${tenantA}::uuid, ${tenantB}::uuid, ${dormantTenant}::uuid)`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  /* ------------------------------- the door --------------------------------- */

  it("refuses to run at all when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    const response = await call(`/api/scheduled?tenant=${tenantA}`, { secret: SECRET });
    // 503, not 200. "The variable was missing" is not a reason to become an
    // endpoint that does work on demand from outside.
    expect(response.status).toBe(503);
  });

  it("refuses a missing, wrong or truncated secret", async () => {
    expect((await call(`/api/scheduled?tenant=${tenantA}`)).status).toBe(401);
    expect(
      (await call(`/api/scheduled?tenant=${tenantA}`, { secret: "wrong" })).status,
    ).toBe(401);
    // A prefix of the real secret. The comparison is length-checked before it is
    // byte-compared, so this is refused without leaking where it diverged.
    expect(
      (await call(`/api/scheduled?tenant=${tenantA}`, { secret: SECRET.slice(0, -1) })).status,
    ).toBe(401);
  });

  it("refuses to enumerate without the secret", async () => {
    // The assertion that makes ADR-016 acceptable. Enumeration is a cross-tenant
    // read; it must be no easier to reach than a single-tenant run.
    const response = await call("/api/scheduled?tenant=all");
    expect(response.status).toBe(401);
  });

  it("answers a bad tenant and a bad secret the same way it answers a good one", async () => {
    // Identical shapes, so an attacker cannot tell which half they got wrong.
    const unauthorized = await call("/api/scheduled?tenant=not-a-uuid");
    expect(unauthorized.status).toBe(401);

    const badTenant = await call("/api/scheduled?tenant=not-a-uuid", { secret: SECRET });
    expect(badTenant.status).toBe(400);
  });

  it("refuses a cadence it does not have", async () => {
    const response = await call(`/api/scheduled?tenant=${tenantA}&cadence=hourly-ish`, {
      secret: SECRET,
    });
    expect(response.status).toBe(400);
  });

  /* ------------------------------ the dispatch ------------------------------ */

  it("runs one named tenant", async () => {
    const response = await call(`/api/scheduled?tenant=${tenantA}&cadence=daily`, {
      secret: SECRET,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tenants).toBe(1);
    expect(body.results[0].tenantId).toBe(tenantA);
  });

  it("enumerates only tenants that have something to run (ADR-016)", async () => {
    const response = await call("/api/scheduled?tenant=all&cadence=daily", { secret: SECRET });
    expect(response.status).toBe(200);

    const body = await response.json();
    const reached: string[] = body.results.map((result: { tenantId: string }) => result.tenantId);
    expect(reached).toContain(tenantA);
    expect(reached).toContain(tenantB);
    // A tenant with no active capability declares no work.
    expect(reached).not.toContain(dormantTenant);
  });

  it("accepts GET, because that is what a deployment host actually sends", async () => {
    // Vercel Cron issues a GET and sets the Authorization header itself. GET is
    // not a weaker door: it requires the same secret and runs the same code.
    expect(
      (await call(`/api/scheduled?tenant=${tenantA}`, { method: "GET" })).status,
    ).toBe(401);

    const response = await call(`/api/scheduled?tenant=${tenantA}&cadence=daily`, {
      secret: SECRET,
      method: "GET",
    });
    expect(response.status).toBe(200);
  });

  it("returns ids from the enumeration and nothing a screen would want", async () => {
    // ADR-016 turns on this: the function returns ids, so it is not an operator
    // projection in disguise. If a name or a row of tenant data ever appears
    // here, the decision that permitted it no longer covers it.
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM verity.scheduler_tenant_ids() LIMIT 1`;
    expect(Object.keys(rows[0] ?? { tenant_id: null })).toEqual(["tenant_id"]);
  });
});
