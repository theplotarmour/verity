import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `src/server/platform/config.ts` — the runtime configuration boundary.
 *
 * `runtimeConfig` is parsed once, at module import, so these tests reimport
 * the module fresh (via `vi.resetModules()`) after mutating `process.env` for
 * each case, the same pattern `proxy.test.ts` uses for the same reason: a
 * top-level `export const x = f()` only re-runs `f()` on a fresh module
 * instance.
 */

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/verity_test",
  NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-for-test",
};

const SNAPSHOT_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_MEDIA_BUCKET",
  "CRON_SECRET",
  "VERITY_TX_TIMEOUT_MS",
  "VERITY_TX_MAX_WAIT_MS",
] as const;

let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  vi.resetModules();
  snapshot = Object.fromEntries(SNAPSHOT_KEYS.map((k) => [k, process.env[k]]));
});

afterEach(() => {
  for (const key of SNAPSHOT_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

async function importConfig() {
  return import("@/server/platform/config");
}

describe("runtime configuration boundary", () => {
  it("throws E_CONFIG_INVALID when DATABASE_URL is missing", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    delete process.env.DATABASE_URL;

    await expect(importConfig()).rejects.toThrow(/E_CONFIG_INVALID/);
  });

  it("throws E_CONFIG_INVALID when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    await expect(importConfig()).rejects.toThrow(/E_CONFIG_INVALID/);
  });

  it("throws E_CONFIG_INVALID when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await expect(importConfig()).rejects.toThrow(/E_CONFIG_INVALID/);
  });

  it("loads successfully and applies the documented transaction-budget defaults", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    delete process.env.VERITY_TX_TIMEOUT_MS;
    delete process.env.VERITY_TX_MAX_WAIT_MS;

    const { runtimeConfig } = await importConfig();

    expect(runtimeConfig.database.url).toBe(REQUIRED_ENV.DATABASE_URL);
    expect(runtimeConfig.database.txTimeoutMs).toBe(15_000);
    expect(runtimeConfig.database.txMaxWaitMs).toBe(5_000);
  });

  it("honours an explicit transaction budget override", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    process.env.VERITY_TX_TIMEOUT_MS = "20000";
    process.env.VERITY_TX_MAX_WAIT_MS = "8000";

    const { runtimeConfig } = await importConfig();

    expect(runtimeConfig.database.txTimeoutMs).toBe(20_000);
    expect(runtimeConfig.database.txMaxWaitMs).toBe(8_000);
  });

  it("falls back the session-cookie signing key to the anon key when SUPABASE_JWT_SECRET is unset", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    delete process.env.SUPABASE_JWT_SECRET;

    const { runtimeConfig } = await importConfig();

    expect(runtimeConfig.auth.jwtSecret).toBe(REQUIRED_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  });

  it("prefers an explicit SUPABASE_JWT_SECRET over the anon-key fallback", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    process.env.SUPABASE_JWT_SECRET = "a-real-signing-secret";

    const { runtimeConfig } = await importConfig();

    expect(runtimeConfig.auth.jwtSecret).toBe("a-real-signing-secret");
  });

  it("leaves storage unconfigured (undefined, not thrown) when no storage variables are set", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_MEDIA_BUCKET;

    const { runtimeConfig } = await importConfig();

    // Storage is optional (files.ts refuses at point of use, not at boot) —
    // supabaseUrl still resolves from the required public URL, but the
    // service key and bucket, which installStorage() also requires, do not.
    expect(runtimeConfig.storage.serviceRoleKey).toBeUndefined();
    expect(runtimeConfig.storage.bucket).toBeUndefined();
  });

  it("prefers SUPABASE_URL over NEXT_PUBLIC_SUPABASE_URL for the storage endpoint", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    process.env.SUPABASE_URL = "https://storage-specific.supabase.co";

    const { runtimeConfig } = await importConfig();

    expect(runtimeConfig.storage.supabaseUrl).toBe("https://storage-specific.supabase.co");
  });

  it("readCronSecret reads process.env live rather than a value cached at import", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    delete process.env.CRON_SECRET;

    const { readCronSecret } = await importConfig();

    expect(readCronSecret()).toBeUndefined();
    process.env.CRON_SECRET = "rotated-secret";
    expect(readCronSecret()).toBe("rotated-secret");
  });
});
