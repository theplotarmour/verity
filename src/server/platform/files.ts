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

/** Storage adapters bind only when deployment credentials are configured. */
export type StorageDriver = {
  name: string;
  /** A URL the client may upload to directly, so bytes never transit the app. */
  createUploadUrl(key: string, mimeType: string, byteSize?: number): Promise<{ url: string; headers?: Record<string, string> }>;
  /** A short-lived read URL. Authorization is decided before this is called. */
  createReadUrl(key: string, expiresInSeconds: number): Promise<string>;
  /** Write verified bytes to a fresh key that has never had an upload URL. */
  storeVerified(key: string, bytes: Uint8Array, mimeType: string): Promise<void>;
  delete(key: string): Promise<void>;
};

let driver: StorageDriver | null = null;

export function registerStorageDriver(next: StorageDriver | null): void {
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
): Promise<{ fileId: string; storageKey: string; uploadUrl?: string; uploadHeaders?: Record<string, string> }> {
  if (!Number.isSafeInteger(args.byteSize) || args.byteSize <= 0 || args.byteSize > 25 * 1024 * 1024) {
    throw new ValidationError("E_VALIDATION: files must be between 1 byte and 25 MB");
  }
  const allowed = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
  if (!allowed.has(args.mimeType)) throw new ValidationError("E_VALIDATION: unsupported file type");

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

  const upload = driver
    ? await driver.createUploadUrl(storageKey, args.mimeType, args.byteSize)
    : undefined;

  return { fileId: record.id, storageKey, uploadUrl: upload?.url, uploadHeaders: upload?.headers };
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

  if (file.status !== "Pending") {
    return { ok: false, status: "Quarantined", reason: "This upload has already been quarantined." };
  }
  let reason: string | undefined;
  let bytes: Buffer | undefined;
  if (file.byteSize !== args.byteSize) {
    reason = `uploaded size ${args.byteSize} does not match the declared ${file.byteSize}`;
  } else {
    if (!driver) throw new StorageUnavailableError();
    const response = await fetch(await driver.createReadUrl(file.storageKey, 60), {
      signal: AbortSignal.timeout(30_000), cache: "no-store",
    });
    if (!response.ok || !response.body) throw new Error("E_STORAGE: uploaded object is unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > file.byteSize || size > 25 * 1024 * 1024) {
          await reader.cancel();
          reason = "Stored bytes exceed the declared size.";
          break;
        }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    if (!reason) {
      bytes = Buffer.concat(chunks);
      if (size !== file.byteSize) reason = "Stored bytes do not match the declared size.";
      else if (checksumOf(bytes) !== args.checksum) reason = "Stored bytes do not match the declared checksum.";
      else if (!matchesFileType(bytes, file.mimeType)) reason = "Stored bytes do not match the declared file type.";
    }
  }
  if (reason) {
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
      reason,
    };
  }

  // The original signed upload URL may remain usable. Serve a new key written
  // from the exact bytes we hashed, so replaying that URL cannot replace evidence.
  if (!driver || !bytes) throw new StorageUnavailableError();
  const sealedKey = storageKeyFor(file.tenantId, file.fileName);
  await driver.storeVerified(sealedKey, bytes, file.mimeType);
  await tx.storedFile.update({
    where: { id: file.id },
    data: { storageKey: sealedKey, status: "Stored", checksum: checksumOf(bytes), confirmedAt: new Date() },
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

/** Content checks supplement attachment-only serving; they are not a malware scanner. */
export function matchesFileType(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mimeType === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mimeType === "image/webp") return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (mimeType.startsWith("application/vnd.openxmlformats-officedocument.")) {
    return bytes.subarray(0, 4).equals(Buffer.from([80,75,3,4]));
  }
  if (mimeType === "text/plain" || mimeType === "text/csv") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return !text.includes("\0") && !/<\s*(?:!doctype\s+html|html|script|svg)\b/i.test(text);
    } catch { return false; }
  }
  return false;
}
