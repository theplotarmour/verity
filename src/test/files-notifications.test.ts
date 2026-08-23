import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/platform/db";
import { assertRlsEnforceable, withTenant } from "@/server/platform/tenancy";
import { provisionIdentity } from "@/server/platform/identity";
import {
  StorageUnavailableError, checksumOf, confirmUpload, readUrlFor, registerStorageDriver,
  reserveUpload, storageKeyFor,
} from "@/server/platform/files";
import { isEnabled, markRead, markSent, notify, renderTemplate, unreadFor } from "@/server/platform/notification";

/**
 * File and notification substrate.
 * Authority: PLA-CFG-002, EXE-AUD-003, MET-EVE-001→002.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

if (!hasDatabase) {
  const message = "files-notifications.test.ts cannot run: DATABASE_URL is unset.";
  if (process.env.CI) throw new Error(message);
  console.warn(message);
}

describeDb("files and notifications", () => {
  const tenantId = randomUUID();
  const otherTenant = randomUUID();
  let userId: string, colleagueId: string;

  beforeAll(async () => {
    await assertRlsEnforceable();
    await withTenant(tenantId, async (tx) => {
      await tx.tenant.create({ data: { id: tenantId, name: "Files Tenant" } });
      const org = await tx.organization.create({ data: { tenantId, name: "HQ" } });
      userId = (await provisionIdentity(tx, { organizationId: org.id, authUserId: randomUUID(), displayName: "Owner" })).userId;
      colleagueId = (await provisionIdentity(tx, { organizationId: org.id, authUserId: randomUUID(), displayName: "Colleague" })).userId;
    });
    await withTenant(otherTenant, (tx) => tx.tenant.create({ data: { id: otherTenant, name: "Other" } }));
  });

  afterAll(async () => {
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    try {
      await admin.$executeRaw`DELETE FROM tenant WHERE id IN (${tenantId}::uuid, ${otherTenant}::uuid)`;
      await admin.$executeRaw`DELETE FROM "user" WHERE id NOT IN (SELECT user_id FROM tenant_membership)`;
      await admin.$executeRaw`DELETE FROM party WHERE id NOT IN (SELECT party_id FROM "user")`;
    } finally { await admin.$disconnect(); }
    await prisma.$disconnect();
  });

  /* --------------------------------- files -------------------------------- */

  it("namespaces every storage key by tenant", () => {
    const key = storageKeyFor(tenantId, "report .pdf");
    expect(key.startsWith(`${tenantId}/`)).toBe(true);
    // Unsafe characters cannot escape the namespace.
    expect(key).not.toContain(" ");
  });

  it("reserves a pending record that is not yet readable", async () => {
    const reserved = await withTenant(tenantId, (tx) =>
      reserveUpload(tx, {
        tenantId, uploadedById: userId, fileName: "cert.pdf",
        mimeType: "application/pdf", byteSize: 1024,
      }),
    );
    const record = await withTenant(tenantId, (tx) =>
      tx.storedFile.findUniqueOrThrow({ where: { id: reserved.fileId } }),
    );
    expect(record.status).toBe("Pending");

    // A pending file may exist, be partial, or be someone else's upload.
    await expect(
      withTenant(tenantId, (tx) => readUrlFor(tx, reserved.fileId)),
    ).rejects.toThrow(/not readable/);
  });

  it("confirms an upload and freezes its identity", async () => {
    const bytes = Buffer.from("calibration certificate");
    const reserved = await withTenant(tenantId, (tx) =>
      reserveUpload(tx, {
        tenantId, uploadedById: userId, fileName: "c.txt",
        mimeType: "text/plain", byteSize: bytes.byteLength,
      }),
    );
    await withTenant(tenantId, (tx) =>
      confirmUpload(tx, { fileId: reserved.fileId, checksum: checksumOf(bytes), byteSize: bytes.byteLength }),
    );

    const stored = await withTenant(tenantId, (tx) =>
      tx.storedFile.findUniqueOrThrow({ where: { id: reserved.fileId } }),
    );
    expect(stored.status).toBe("Stored");
    expect(stored.checksum).toBe(checksumOf(bytes));

    // EXE-AUD-003: replacing the bytes behind a reference is how a trail becomes
    // deniable, so the key and checksum are frozen at confirmation.
    await expect(
      withTenant(tenantId, (tx) =>
        tx.storedFile.update({ where: { id: stored.id }, data: { checksum: "tampered" } }),
      ),
    ).rejects.toThrow(/immutable once stored/);
  });

  it("quarantines an upload whose size disagrees with the reservation", async () => {
    const reserved = await withTenant(tenantId, (tx) =>
      reserveUpload(tx, { tenantId, uploadedById: userId, fileName: "x.bin", mimeType: "application/octet-stream", byteSize: 100 }),
    );
    const result = await withTenant(tenantId, (tx) =>
      confirmUpload(tx, { fileId: reserved.fileId, checksum: "abc", byteSize: 999 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/does not match the declared/);

    const record = await withTenant(tenantId, (tx) =>
      tx.storedFile.findUniqueOrThrow({ where: { id: reserved.fileId } }),
    );
    expect(record.status).toBe("Quarantined");
  });

  it("confirms idempotently", async () => {
    const bytes = Buffer.from("idem");
    const reserved = await withTenant(tenantId, (tx) =>
      reserveUpload(tx, { tenantId, uploadedById: userId, fileName: "i.txt", mimeType: "text/plain", byteSize: bytes.byteLength }),
    );
    const confirm = () =>
      withTenant(tenantId, (tx) =>
        confirmUpload(tx, { fileId: reserved.fileId, checksum: checksumOf(bytes), byteSize: bytes.byteLength }),
      );
    await confirm();
    await expect(confirm()).resolves.toEqual({ ok: true });
  });

  it("reports honestly that no storage backend is bound", async () => {
    const bytes = Buffer.from("needs a driver");
    const reserved = await withTenant(tenantId, (tx) =>
      reserveUpload(tx, { tenantId, uploadedById: userId, fileName: "d.txt", mimeType: "text/plain", byteSize: bytes.byteLength }),
    );
    await withTenant(tenantId, (tx) =>
      confirmUpload(tx, { fileId: reserved.fileId, checksum: checksumOf(bytes), byteSize: bytes.byteLength }),
    );
    // The record layer works; binding a backend is a deployment step, and
    // saying so beats pretending a URL exists.
    await expect(withTenant(tenantId, (tx) => readUrlFor(tx, reserved.fileId)))
      .rejects.toBeInstanceOf(StorageUnavailableError);

    registerStorageDriver({
      name: "test",
      createUploadUrl: async (key) => ({ url: `https://test.invalid/put/${key}` }),
      createReadUrl: async (key) => `https://test.invalid/get/${key}`,
      delete: async () => {},
    });
    await expect(withTenant(tenantId, (tx) => readUrlFor(tx, reserved.fileId)))
      .resolves.toContain("https://test.invalid/get/");
  });

  it("keeps files invisible to another tenant", async () => {
    expect(await withTenant(otherTenant, (tx) => tx.storedFile.count())).toBe(0);
  });

  /* ----------------------------- notifications ---------------------------- */

  it("substitutes template placeholders literally", () => {
    expect(renderTemplate("Hello {name}, {count} waiting", { name: "Sam", count: "3" }))
      .toBe("Hello Sam, 3 waiting");
    // An unknown placeholder is left intact rather than blanked, so a broken
    // template is visible instead of silently losing information.
    expect(renderTemplate("Hi {missing}", {})).toBe("Hi {missing}");
  });

  it("defaults to enabled when no preference exists", async () => {
    expect(await withTenant(tenantId, (tx) =>
      isEnabled(tx, { userId, key: "verity.test.thing", channel: "InApp" }),
    )).toBe(true);
  });

  it("lets a specific key preference beat the wildcard", async () => {
    await withTenant(tenantId, async (tx) => {
      await tx.notificationPreference.create({
        data: { tenantId, userId, key: "*", channel: "Email", enabled: false },
      });
      await tx.notificationPreference.create({
        data: { tenantId, userId, key: "verity.test.important", channel: "Email", enabled: true },
      });
    });
    expect(await withTenant(tenantId, (tx) => isEnabled(tx, { userId, key: "verity.test.other", channel: "Email" }))).toBe(false);
    expect(await withTenant(tenantId, (tx) => isEnabled(tx, { userId, key: "verity.test.important", channel: "Email" }))).toBe(true);
  });

  it("raises notifications and records suppression rather than dropping it", async () => {
    const out = await withTenant(tenantId, (tx) =>
      notify(tx, {
        tenantId, recipientIds: [userId], key: "verity.test.other",
        channels: ["InApp", "Email"], fallback: { subject: "S", body: "B" },
      }),
    );
    // InApp allowed, Email suppressed by the wildcard preference.
    expect(out).toEqual({ created: 1, suppressed: 1 });

    const suppressed = await withTenant(tenantId, (tx) =>
      tx.notification.findFirst({ where: { key: "verity.test.other", channel: "Email" } }),
    );
    // "Why was nobody told" must be answerable.
    expect(suppressed?.status).toBe("Suppressed");
  });

  it("uses a tenant template when one exists", async () => {
    await withTenant(tenantId, (tx) =>
      tx.notificationTemplate.create({
        data: { tenantId, key: "verity.test.templated", channel: "InApp",
                subject: "{count} awaiting", body: "Hello {name}" },
      }),
    );
    await withTenant(tenantId, (tx) =>
      notify(tx, { tenantId, recipientIds: [userId], key: "verity.test.templated",
                   variables: { count: "4", name: "Sam" } }),
    );
    const sent = await withTenant(tenantId, (tx) =>
      tx.notification.findFirstOrThrow({ where: { key: "verity.test.templated" } }),
    );
    expect(sent.subject).toBe("4 awaiting");
    expect(sent.body).toBe("Hello Sam");
  });

  it("shows a recipient only their own notifications", async () => {
    await withTenant(tenantId, (tx) =>
      notify(tx, { tenantId, recipientIds: [colleagueId], key: "verity.test.private",
                   fallback: { subject: "Private", body: "" } }),
    );
    const mine = await withTenant(tenantId, (tx) => unreadFor(tx, userId));
    expect(mine.some((n) => n.key === "verity.test.private")).toBe(false);
  });

  it("marks read only the actor's own notifications", async () => {
    const before = await withTenant(tenantId, (tx) => unreadFor(tx, userId));
    expect(before.length).toBeGreaterThan(0);
    const marked = await withTenant(tenantId, (tx) => markRead(tx, { userId }));
    expect(marked).toBe(before.length);
    expect(await withTenant(tenantId, (tx) => unreadFor(tx, userId))).toHaveLength(0);

    // The colleague's notification is untouched.
    expect((await withTenant(tenantId, (tx) => unreadFor(tx, colleagueId))).length).toBeGreaterThan(0);
  });

  it("records a delivery failure instead of silently succeeding", async () => {
    const pending = await withTenant(tenantId, (tx) =>
      tx.notification.findFirstOrThrow({ where: { status: "Pending" } }),
    );
    await withTenant(tenantId, (tx) => markSent(tx, [pending.id], "smtp unavailable"));
    const after = await withTenant(tenantId, (tx) =>
      tx.notification.findUniqueOrThrow({ where: { id: pending.id } }),
    );
    expect(after.status).toBe("Failed");
    expect(after.failure).toBe("smtp unavailable");
  });
});
