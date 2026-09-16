import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const healthy = {
  probeDatabase: vi.fn().mockResolvedValue(undefined),
  probeSchema: vi.fn().mockResolvedValue(undefined),
  probeRls: vi.fn().mockResolvedValue(undefined),
  probeIdentity: vi.fn().mockResolvedValue({ status: "ok" }),
  probeStorage: vi.fn().mockResolvedValue({ status: "skipped", code: "storage_not_configured" }),
  probeScheduler: vi.fn().mockResolvedValue(undefined),
  probeRestoreState: vi.fn().mockResolvedValue(undefined),
  probeRuntimePrivileges: vi.fn(),
};

beforeEach(() => {
  vi.resetModules();
  for (const mock of Object.values(healthy)) mock.mockReset();
  healthy.probeDatabase.mockResolvedValue(undefined);
  healthy.probeSchema.mockResolvedValue(undefined);
  healthy.probeRls.mockResolvedValue(undefined);
  healthy.probeIdentity.mockResolvedValue({ status: "ok" });
  healthy.probeStorage.mockResolvedValue({ status: "skipped", code: "storage_not_configured" });
  healthy.probeScheduler.mockResolvedValue(undefined);
  healthy.probeRestoreState.mockResolvedValue(undefined);
  healthy.probeRuntimePrivileges.mockReturnValue(undefined);
  vi.doMock("@/server/platform/readiness", () => healthy);
});

afterEach(() => vi.doUnmock("@/server/platform/readiness"));

describe("GET /api/health — liveness", () => {
  it("returns 200 without running dependency probes", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok" });
    expect(healthy.probeDatabase).not.toHaveBeenCalled();
  });
});

describe("GET /api/ready — profile-aware readiness", () => {
  it("returns 200 only when every required dependency is healthy", async () => {
    const { GET } = await import("@/app/api/ready/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ready");
    expect(body.checks).toMatchObject({
      db: { status: "ok" },
      schema: { status: "ok" },
      rls: { status: "ok" },
      identity: { status: "ok" },
      storage: { status: "skipped", code: "storage_not_configured" },
      scheduler: { status: "ok" },
      restore: { status: "ok" },
      runtime: { status: "ok" },
    });
  });

  it("returns stable redacted reason codes for failed dependencies", async () => {
    healthy.probeDatabase.mockRejectedValue(
      new Error("postgresql://verity_app:s3cr3t@db.example.test/verity"),
    );
    healthy.probeScheduler.mockRejectedValue(new Error("last run was stale"));
    const { GET } = await import("@/app/api/ready/route");
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.checks.db).toEqual({ status: "error", code: "database_unavailable" });
    expect(body.checks.scheduler).toEqual({ status: "error", code: "scheduler_stale" });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("s3cr3t");
    expect(serialized).not.toContain("db.example.test");
  });

  it("does not opt into static prerendering", async () => {
    const route = await import("@/app/api/ready/route");
    expect(route.dynamic).toBe("force-dynamic");
  });
});

describe("proxy matcher — health/readiness bypass", () => {
  it("excludes liveness and readiness from the proxy", async () => {
    const { config } = await import("@/proxy");
    const pattern = config.matcher[0]!;
    expect(pattern).toContain("api/health");
    expect(pattern).toContain("api/ready");
    expect(() => new RegExp(pattern)).not.toThrow();
  });
});
