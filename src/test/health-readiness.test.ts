import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Health/readiness endpoints (Task 32).
 *
 * Every route test dynamically imports the route module after `vi.doMock` +
 * `vi.resetModules()` (the same pattern `config.test.ts`/`auth-provider.test.ts`
 * use) so each test controls exactly what `@/server/platform/db` does,
 * without ever touching a real database.
 */

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@/server/platform/db");
  vi.useRealTimers();
});

describe("GET /api/health — liveness", () => {
  it("returns 200 with status ok and the package version", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(body.version.length).toBeGreaterThan(0);
  });

  it("never touches the database", async () => {
    // A tripwire, not a spy on a call that already doesn't happen: if this
    // route ever DID import the Prisma singleton, accessing it here throws
    // immediately rather than silently succeeding.
    vi.doMock("@/server/platform/db", () => ({
      get prisma(): never {
        throw new Error("health handler must not touch the database");
      },
    }));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it("does not opt into static prerendering", async () => {
    const routeModule = await import("@/app/api/health/route");
    expect(routeModule.dynamic).toBe("force-dynamic");
  });
});

describe("GET /api/ready — readiness", () => {
  it("returns 200 with status ready when the database probe resolves", async () => {
    vi.doMock("@/server/platform/db", () => ({
      prisma: { $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]) },
    }));

    const { GET } = await import("@/app/api/ready/route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: "ready", checks: { db: "ok" } });
  });

  it("returns 503 with status not_ready when the database probe rejects", async () => {
    vi.doMock("@/server/platform/db", () => ({
      prisma: {
        $queryRaw: vi.fn().mockRejectedValue(
          new Error("Can't reach database server at `db:5432`"),
        ),
      },
    }));

    const { GET } = await import("@/app/api/ready/route");
    const response = await GET();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe("not_ready");
    expect(body.checks.db).toBe("error");
    expect(body.checks.detail).toMatch(/Can't reach database server/);
  });

  it("redacts credentials from the connection error before returning it", async () => {
    vi.doMock("@/server/platform/db", () => ({
      prisma: {
        $queryRaw: vi.fn().mockRejectedValue(
          new Error(
            "authentication failed at postgresql://verity_app:s3cr3t@db.example.com:5432/verity",
          ),
        ),
      },
    }));

    const { GET } = await import("@/app/api/ready/route");
    const response = await GET();
    const body = await response.json();

    expect(body.checks.detail).not.toContain("s3cr3t");
    expect(body.checks.detail).not.toContain("verity_app:s3cr3t");
    expect(body.checks.detail).toContain("<redacted>");
  });

  it("returns 503 with a clear message when the probe exceeds the timeout", async () => {
    vi.useFakeTimers();
    vi.doMock("@/server/platform/db", () => ({
      // Never settles — forces the timeout branch of Promise.race to win.
      prisma: { $queryRaw: vi.fn(() => new Promise(() => {})) },
    }));

    const { GET } = await import("@/app/api/ready/route");
    const responsePromise = GET();

    await vi.advanceTimersByTimeAsync(3000);
    const response = await responsePromise;

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe("not_ready");
    expect(body.checks.detail).toMatch(/timed out/);
  });

  it("does not opt into static prerendering", async () => {
    vi.doMock("@/server/platform/db", () => ({
      prisma: { $queryRaw: vi.fn().mockResolvedValue([1]) },
    }));
    const routeModule = await import("@/app/api/ready/route");
    expect(routeModule.dynamic).toBe("force-dynamic");
  });
});

describe("proxy matcher — health/readiness bypass", () => {
  it("excludes /api/health and /api/ready from the negative-lookahead matcher", async () => {
    const { config } = await import("@/proxy");
    const pattern = config.matcher[0]!;

    expect(pattern).toContain("api/health");
    expect(pattern).toContain("api/ready");
    // Sanity: the pattern still compiles as a real regex (it is one, inside
    // Next's own matcher syntax) and still excludes what it excluded before
    // this task — this change only ADDS exclusions, it does not narrow the
    // set of routes the proxy otherwise protects.
    expect(() => new RegExp(pattern)).not.toThrow();
    expect(pattern).toContain("_next/static");
    expect(pattern).toContain("favicon.ico");
  });
});
