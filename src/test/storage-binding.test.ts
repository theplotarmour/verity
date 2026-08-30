import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import {
  checksumOf,
  confirmUpload,
  readUrlFor,
  reserveUpload,
  storageDriver,
  storageKeyFor,
} from "@/server/platform/files";
import { installStorage } from "@/server/storage";

/**
 * The storage binding.
 *
 * `files.ts` shipped a complete contract with no provider and said so. This
 * asserts that binding Supabase Storage actually carries bytes end to end —
 * reserve, upload, confirm, read back, and get the same bytes out — because a
 * driver that satisfies the interface but cannot round-trip a file is exactly
 * what the platform refused to pretend it had.
 *
 * The round trip is deliberate. Mocking the driver would test the mock; the
 * whole value of a binding is that it works against the real service, and the
 * file it writes is deleted at the end.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const hasStorage = Boolean(
  (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_MEDIA_BUCKET,
);

const describeDb = hasDatabase && hasStorage ? describe : describe.skip;

if (!hasStorage) {
  // Not a failure. A deployment without storage is a valid deployment, and the
  // platform refuses at the point of use rather than at boot for that reason.
  console.warn("storage-binding.test.ts skipped: no storage variables configured.");
}

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

describe("storage: the contract without a driver", () => {
  it("names a tenant-scoped key, so a misconfiguration cannot cross tenants", () => {
    const tenantId = randomUUID();
    const key = storageKeyFor(tenantId, "LR scan (final).pdf");
    expect(key.startsWith(`${tenantId}/`)).toBe(true);
    // Whatever the user called the file, the key is safe to put in a URL.
    expect(key).not.toContain(" ");
    expect(key).not.toContain("(");
  });

  it("checksums bytes, not a name", () => {
    const a = checksumOf(Buffer.from("lorry receipt"));
    const b = checksumOf(Buffer.from("lorry receipt"));
    const c = checksumOf(Buffer.from("lorry receipt "));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describeDb("storage: Supabase, end to end", () => {
  const tenantId = randomUUID();
  const bytes = Buffer.from(`LR scan placeholder ${randomUUID()}`);
  let storageKey: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    installStorage();
    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({ data: { id: tenantId, name: "Storage Test" } });
    });
  });

  afterAll(async () => {
    // Clean up the object as well as the row. A test that leaves files in a
    // bucket is a test that quietly bills somebody.
    const driver = storageDriver();
    if (driver && storageKey) {
      await driver.delete(storageKey).catch(() => undefined);
    }
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id = ${tenantId}::uuid`;
    } finally {
      await admin.$disconnect();
    }
    await prisma.$disconnect();
  });

  it("registers a driver when the deployment has one configured", () => {
    const driver = storageDriver();
    expect(driver).not.toBeNull();
    expect(driver!.name.startsWith("supabase:")).toBe(true);
  });

  it("carries bytes from reserve through confirm to read", async () => {
    const reserved = await withTenant(tenantId, (tx) =>
      reserveUpload(tx, {
        tenantId,
        uploadedById: null,
        fileName: "lr-scan.txt",
        mimeType: "text/plain",
        byteSize: bytes.byteLength,
      }),
    );
    storageKey = reserved.storageKey;

    // The client uploads directly. Bytes never transit the application, which is
    // the shape `reserveUpload` returns an upload URL for.
    expect(reserved.uploadUrl).toBeDefined();
    const uploaded = await fetch(reserved.uploadUrl!, {
      method: "PUT",
      headers: { "content-type": "text/plain" },
      body: new Uint8Array(bytes),
    });
    expect(uploaded.ok).toBe(true);

    const confirmed = await withTenant(tenantId, (tx) =>
      confirmUpload(tx, {
        fileId: reserved.fileId,
        checksum: checksumOf(bytes),
        byteSize: bytes.byteLength,
      }),
    );
    expect(confirmed.ok).toBe(true);

    const url = await withTenant(tenantId, (tx) => readUrlFor(tx, reserved.fileId, 60));
    const readBack = await fetch(url);
    expect(readBack.ok).toBe(true);
    expect(Buffer.from(await readBack.arrayBuffer()).toString()).toBe(bytes.toString());
  });

  it("never serves a file whose bytes did not match what was declared", async () => {
    const reserved = await withTenant(tenantId, (tx) =>
      reserveUpload(tx, {
        tenantId,
        uploadedById: null,
        fileName: "wrong-size.txt",
        mimeType: "text/plain",
        byteSize: 1000,
      }),
    );

    const outcome = await withTenant(tenantId, (tx) =>
      confirmUpload(tx, { fileId: reserved.fileId, checksum: checksumOf(bytes), byteSize: 12 }),
    );
    expect(outcome.ok).toBe(false);

    // Quarantined, and quarantined VISIBLY — the rejection is a record, not a
    // rolled-back transaction that erased its own evidence.
    await expect(
      withTenant(tenantId, (tx) => readUrlFor(tx, reserved.fileId)),
    ).rejects.toThrow(/quarantined/i);

    const driver = storageDriver();
    await driver!.delete(reserved.storageKey).catch(() => undefined);
  });
});
