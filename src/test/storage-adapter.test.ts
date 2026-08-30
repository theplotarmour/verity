import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit coverage for the storage adapter boundary (Task 27).
 *
 * `storage-binding.test.ts` proves the Supabase driver end to end against a
 * real project and skips itself without live credentials — valuable, but it
 * never runs locally without a configured bucket. These tests mock
 * `@supabase/supabase-js` so the driver's own logic (URL/error handling,
 * `installStorage()`'s conditional registration) is verified unconditionally,
 * with no network dependency.
 *
 * Every test dynamically imports the modules under test after `vi.doMock`
 * and `vi.resetModules()`, the same pattern `config.test.ts` and
 * `proxy.test.ts` use — `runtimeConfig` and the `installed`/`driver` module
 * singletons in `config.ts`/`supabase.ts`/`files.ts` are all fixed at first
 * import, so a fresh module graph per test is the only way to observe a
 * different environment or call `installStorage()` from a clean state.
 */

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/verity_test",
  NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-for-test",
};

const STORAGE_ENV = {
  SUPABASE_URL: "https://project-ref.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-for-test",
  SUPABASE_MEDIA_BUCKET: "verity-media-test",
};

const SNAPSHOT_KEYS = [
  ...Object.keys(REQUIRED_ENV),
  ...Object.keys(STORAGE_ENV),
] as const;

let snapshot: Record<string, string | undefined>;
const createClient = vi.fn();

beforeEach(() => {
  vi.resetModules();
  createClient.mockReset();
  snapshot = Object.fromEntries(SNAPSHOT_KEYS.map((k) => [k, process.env[k]]));
});

afterEach(() => {
  for (const key of SNAPSHOT_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
  vi.doUnmock("@supabase/supabase-js");
});

/** A fake Supabase client whose `.storage.from(bucket)` returns `storageApi`. */
function mockSupabaseClient(storageApi: {
  createSignedUploadUrl?: ReturnType<typeof vi.fn>;
  createSignedUrl?: ReturnType<typeof vi.fn>;
  remove?: ReturnType<typeof vi.fn>;
}) {
  vi.doMock("@supabase/supabase-js", () => ({
    createClient: createClient.mockReturnValue({
      storage: { from: vi.fn(() => storageApi) },
    }),
  }));
}

describe("installStorage(): conditional registration", () => {
  it("registers no driver when storage variables are entirely absent", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    // Set to "" rather than delete: importing the driver transitively pulls in
    // Prisma's client (files.ts -> command.ts -> db.ts), whose own env loader
    // repopulates a genuinely-deleted key from .env — but leaves an
    // already-present (even empty) key alone. "" is still falsy for
    // installStorage()'s `!bucket` check, so the test condition holds either way.
    for (const key of Object.keys(STORAGE_ENV)) process.env[key] = "";
    mockSupabaseClient({});

    const { installStorage } = await import("@/server/storage");
    const { storageDriver } = await import("@/server/platform/files");

    installStorage();
    expect(storageDriver()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("registers no driver when only some storage variables are set", async () => {
    Object.assign(process.env, REQUIRED_ENV);
    process.env.SUPABASE_MEDIA_BUCKET = STORAGE_ENV.SUPABASE_MEDIA_BUCKET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    mockSupabaseClient({});

    const { installStorage } = await import("@/server/storage");
    const { storageDriver } = await import("@/server/platform/files");

    installStorage();
    expect(storageDriver()).toBeNull();
  });

  it("registers a driver named after its bucket when fully configured", async () => {
    Object.assign(process.env, REQUIRED_ENV, STORAGE_ENV);
    mockSupabaseClient({});

    const { installStorage } = await import("@/server/storage");
    const { storageDriver } = await import("@/server/platform/files");

    installStorage();
    const driver = storageDriver();
    expect(driver).not.toBeNull();
    expect(driver!.name).toBe(`supabase:${STORAGE_ENV.SUPABASE_MEDIA_BUCKET}`);
  });

  it("is idempotent: a second call does not construct a second client", async () => {
    Object.assign(process.env, REQUIRED_ENV, STORAGE_ENV);
    mockSupabaseClient({});

    const { installStorage } = await import("@/server/storage");

    installStorage();
    installStorage();
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});

describe("supabaseStorageDriver(): adapter behavior", () => {
  async function driver(storageApi: Parameters<typeof mockSupabaseClient>[0]) {
    mockSupabaseClient(storageApi);
    const { supabaseStorageDriver } = await import("@/server/storage/supabase");
    return supabaseStorageDriver({
      url: STORAGE_ENV.SUPABASE_URL,
      serviceRoleKey: STORAGE_ENV.SUPABASE_SERVICE_ROLE_KEY,
      bucket: STORAGE_ENV.SUPABASE_MEDIA_BUCKET,
    });
  }

  it("createUploadUrl returns a signed URL and the declared content type as a header", async () => {
    const d = await driver({
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.test/upload" },
        error: null,
      }),
    });

    const result = await d.createUploadUrl("tenant/key.pdf", "application/pdf");
    expect(result.url).toBe("https://signed.test/upload");
    expect(result.headers).toEqual({ "content-type": "application/pdf" });
  });

  it("createUploadUrl throws E_STORAGE when Supabase returns an error", async () => {
    const d = await driver({
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "bucket not found" },
      }),
    });

    await expect(d.createUploadUrl("tenant/key.pdf", "application/pdf")).rejects.toThrow(
      /E_STORAGE.*bucket not found/,
    );
  });

  it("createReadUrl returns a signed URL", async () => {
    const d = await driver({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.test/read" },
        error: null,
      }),
    });

    await expect(d.createReadUrl("tenant/key.pdf", 300)).resolves.toBe("https://signed.test/read");
  });

  it("createReadUrl throws E_STORAGE when Supabase returns no data", async () => {
    const d = await driver({
      createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    await expect(d.createReadUrl("tenant/key.pdf", 300)).rejects.toThrow(/E_STORAGE/);
  });

  it("delete resolves when Supabase reports no error", async () => {
    const d = await driver({ remove: vi.fn().mockResolvedValue({ error: null }) });
    await expect(d.delete("tenant/key.pdf")).resolves.toBeUndefined();
  });

  it("delete throws E_STORAGE when Supabase reports an error", async () => {
    const d = await driver({
      remove: vi.fn().mockResolvedValue({ error: { message: "object not found" } }),
    });

    await expect(d.delete("tenant/key.pdf")).rejects.toThrow(/E_STORAGE.*object not found/);
  });
});
