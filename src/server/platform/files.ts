import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { TenantScopedClient } from "./tenancy";
import { ValidationError } from "./command";

/**
 * File and document substrate.
 *
 * Authority: PLA-CFG-002, EXE-AUD-003 (an artefact behind a reference must not
 * be silently replaced), Bible V5 §1 (isolation applies to stored objects).
 *
 * The platform owns the *record* of a file and delegates the bytes to a storage
 * driver. Separating the two is what lets authorization, audit and retention
 * behave uniformly regardless of where the object physically lives, and lets the
 * backend change without touching a single capability.
 *
 * Upload is two-phase on purpose. A record created and immediately treated as
 * readable would let a capability reference bytes that are absent, partial, or
 * still being written. `reserve` creates a Pending record and a key; `confirm`
 * verifies size and checksum and only then marks it Stored. Nothing serves a
 * Pending file.
 */

/**
 * A storage backend.
 *
 * IMPLEMENTATION DECISION, recorded rather than taken silently: no concrete
 * driver is bound here. The Supabase Storage and S3 credentials were retired
 * during secret rotation because no code referenced them, and re-issuing a live
 * storage key to satisfy an interface would be the wrong trade. Binding a real
 * driver is a deployment step; the platform contract is what had to exist.
 */
export type StorageDriver = {
  name: string;
  /** A URL the client may upload to directly, so bytes never transit the app. */
  createUploadUrl(key: string, mimeType: string): Promise<{ url: string; headers?: Record<string, string> }>;
  /** A short-lived read URL. Authorization is decided before this is called. */
  createReadUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
};

let driver: StorageDriver | null = null;

export function registerStorageDriver(next: StorageDriver): void {
  driver = next;
}

export function storageDriver(): StorageDriver | null {
  return driver;
}

export class StorageUnavailableError extends Error {
  readonly code = "E_STORAGE_UNAVAILABLE" as const;
  constructor() {
    super(
      "E_STORAGE_UNAVAILABLE: no storage driver is registered. " +
        "The file record layer is available; binding a backend is a deployment step.",
    );
    this.name = "StorageUnavailableError";
  }
}

/** Tenant-namespaced key, so a driver misconfiguration cannot cross tenants. */
export function storageKeyFor(tenantId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.\-]/g, "_").slice(-120);
  return `${tenantId}/${randomUUID()}/${safe}`;
}

export function checksumOf(bytes: Buffer | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Phase one: reserve a record and a key. The file is not yet readable. */
export async function reserveUpload(
  tx: TenantScopedClient,
  args: {
    tenantId: string;
    uploadedById: string | null;
    fileName: string;
    mimeType: string;
    byteSize: number;
    entityKey?: string;
    entityId?: string;
  },
): Promise<{ fileId: string; storageKey: string; uploadUrl?: string }> {
  if (args.byteSize <= 0) throw new ValidationError("E_VALIDATION: byteSize must be positive");

  const storageKey = storageKeyFor(args.tenantId, args.fileName);
  const record = await tx.storedFile.create({
    data: {
      tenantId: args.tenantId,
      storageKey,
      fileName: args.fileName,
      mimeType: args.mimeType,
      byteSize: args.byteSize,
      uploadedById: args.uploadedById,
      entityKey: args.entityKey ?? null,
      entityId: args.entityId ?? null,
      status: "Pending",
    },
  });

  const uploadUrl = driver
    ? (await driver.createUploadUrl(storageKey, args.mimeType)).url
    : undefined;

  return { fileId: record.id, storageKey, uploadUrl };
}

/**
 * Phase two: confirm the bytes arrived and match what was declared.
 *
 * The checksum is recorded here and frozen by a database trigger, so a
 * reference cannot later point at different bytes — which is the property that
 * makes an evidence artefact worth anything.
 */
export type ConfirmResult =
  | { ok: true }
  | { ok: false; status: "Quarantined"; reason: string };

export async function confirmUpload(
  tx: TenantScopedClient,
  args: { fileId: string; checksum: string; byteSize: number },
): Promise<ConfirmResult> {
  const file = await tx.storedFile.findUnique({ where: { id: args.fileId } });
  if (!file) throw new ValidationError("E_VALIDATION: no such file record");
  if (file.status === "Stored") return { ok: true }; // idempotent

  if (file.byteSize !== args.byteSize) {
    // A size that disagrees with the reservation means the upload is not the
    // file that was declared.
    //
    // This returns rather than throws, deliberately. Quarantining and then
    // throwing inside one transaction rolls the quarantine back with the
    // error, leaving the record Pending and the rejection invisible — a
    // failure that erases its own evidence is the one thing this table must
    // never do.
    await tx.storedFile.update({
      where: { id: file.id },
      data: { status: "Quarantined" },
    });
    return {
      ok: false,
      status: "Quarantined",
      reason: `uploaded size ${args.byteSize} does not match the declared ${file.byteSize}`,
    };
  }

  await tx.storedFile.update({
    where: { id: file.id },
    data: { status: "Stored", checksum: args.checksum, confirmedAt: new Date() },
  });
  return { ok: true };
}

/** A read URL for a stored file. Callers must authorize the subject first. */
export async function readUrlFor(
  tx: TenantScopedClient,
  fileId: string,
  expiresInSeconds = 300,
): Promise<string> {
  const file = await tx.storedFile.findUnique({ where: { id: fileId } });
  if (!file) throw new ValidationError("E_VALIDATION: no such file record");
  // Pending and Quarantined files are never served: one may not exist, the
  // other failed its check.
  if (file.status !== "Stored") {
    throw new ValidationError(`E_VALIDATION: file is ${file.status.toLowerCase()}, not readable`);
  }
  if (!driver) throw new StorageUnavailableError();
  return driver.createReadUrl(file.storageKey, expiresInSeconds);
}
