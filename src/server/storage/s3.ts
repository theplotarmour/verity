import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageDriver } from "@/server/platform/files";

/**
 * An S3-compatible object store as a `StorageDriver`.
 *
 * Authority: taskplans/41_s3_storage_implementation.md; Task 27 created the
 * seam this fills.
 *
 * WHY A SECOND DRIVER EXISTS AT ALL
 * The test of an abstraction is not that it exists; it is that a second
 * implementation fits without the interface moving. `platform/files.ts` is
 * unchanged by this file, and so is every capability. That is the finding, and
 * it is worth more than the driver.
 *
 * S3-COMPATIBLE, NOT VENDOR-SPECIFIC
 * Nothing here knows about AWS, MinIO, SeaweedFS, Ceph or Wasabi. They are one
 * adapter with different configuration — an endpoint, a region, a bucket, a key
 * pair, and an addressing style. A driver written against one vendor's
 * extensions would have made the next deployment a fork, which is the outcome
 * this whole seam exists to prevent.
 *
 * PRESIGNED URLS THROUGHOUT
 * Exactly as the Supabase driver does. Bytes travel directly between the client
 * and the object store and never transit the application — the shape
 * `reserveUpload` was written for, and the reason a 200MB site photograph does
 * not become a Node memory problem.
 */

export type S3Settings = {
  bucket: string;
  region: string;
  /** Omit for AWS; required for MinIO, SeaweedFS, Ceph and every other server. */
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /**
   * Path-style addressing (`https://host/bucket/key`) rather than
   * virtual-hosted (`https://bucket.host/key`).
   *
   * This matters more than it looks. MinIO and SeaweedFS serve path-style; AWS
   * serves virtual-hosted. Getting it wrong produces a signature computed
   * against the wrong host, which surfaces as `SignatureDoesNotMatch` and reads
   * exactly like a bad secret key — an operator can lose a day to it.
   */
  forcePathStyle?: boolean;
};

/** Reused across calls: an S3 client is a connection pool, not a request object. */
let cached: { key: string; client: S3Client } | null = null;

function clientFor(settings: S3Settings): S3Client {
  const key = `${settings.endpoint ?? "aws"}|${settings.region}|${settings.accessKeyId}|${settings.forcePathStyle ?? false}`;
  if (cached?.key === key) return cached.client;

  const client = new S3Client({
    region: settings.region,
    ...(settings.endpoint ? { endpoint: settings.endpoint } : {}),
    forcePathStyle: settings.forcePathStyle ?? Boolean(settings.endpoint),
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
  });
  cached = { key, client };
  return client;
}

/** Test seam: drops the cached client so a new configuration takes effect. */
export function resetS3Client(): void {
  cached = null;
}

export function s3StorageDriver(
  settings: S3Settings,
  deps: { sign?: typeof getSignedUrl; client?: S3Client } = {},
): StorageDriver {
  const client = deps.client ?? clientFor(settings);
  const sign = deps.sign ?? getSignedUrl;

  return {
    // Names the bucket, not the vendor: two S3 deployments against different
    // buckets are legitimately different drivers to an operator reading a log.
    name: `s3:${settings.bucket}`,

    async createUploadUrl(key, mimeType) {
      try {
        const url = await sign(
          client,
          new PutObjectCommand({
            Bucket: settings.bucket,
            Key: key,
            ContentType: mimeType,
          }),
          { expiresIn: 900 },
        );
        return {
          url,
          // Signed into the request, so it must be sent. The platform still
          // re-checks size and checksum on confirmation — a client-declared
          // content type is a convenience, never a control.
          headers: { "content-type": mimeType },
        };
      } catch (error) {
        throw new Error(`E_STORAGE: could not create an upload URL (${message(error)})`);
      }
    },

    async createReadUrl(key, expiresInSeconds) {
      try {
        return await sign(
          client,
          new GetObjectCommand({ Bucket: settings.bucket, Key: key }),
          { expiresIn: expiresInSeconds },
        );
      } catch (error) {
        throw new Error(`E_STORAGE: could not create a read URL (${message(error)})`);
      }
    },

    async delete(key) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: settings.bucket, Key: key }));
      } catch (error) {
        throw new Error(`E_STORAGE: could not delete the object (${message(error)})`);
      }
    },
  };
}

/**
 * Error text without the credential.
 *
 * An SDK error can carry the signed URL or the request it was building, and a
 * signed URL contains the access key id and the signature. This is the same
 * discipline `integration.ts` applies to transport errors.
 */
function message(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/X-Amz-Credential=[^&\s]+/gi, "X-Amz-Credential=[redacted]")
    .replace(/X-Amz-Signature=[^&\s]+/gi, "X-Amz-Signature=[redacted]");
}
