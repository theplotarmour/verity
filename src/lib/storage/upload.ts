import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseStorageErrorMessage } from "@/lib/supabase/admin-errors";
import { STORAGE_BUCKET } from "./config";
import { validateUploadFile } from "./validate-upload";

export type StorageUploadInput = {
  path: string;
  dataUrl: string;
  fileName?: string;
  mimeType: string;
  size: number;
  cacheControl?: string;
};

// The app stores getPublicUrl() links, so the media bucket must be public or
// every image 403s ("coming as a Supabase URL, not viewable"). Ensure it once
// per server instance — creating it public if missing, flipping it public if it
// was created private. Flipping the bucket is retroactive, so one upload makes
// every already-stored image load. Best-effort: never fail an upload over it.
let bucketEnsured = false;
async function ensureBucketPublic(client: ReturnType<typeof getSupabaseAdminClient>) {
  if (bucketEnsured) return;
  try {
    const { data } = await client.storage.getBucket(STORAGE_BUCKET);
    if (!data) {
      await client.storage.createBucket(STORAGE_BUCKET, { public: true });
    } else if (!data.public) {
      await client.storage.updateBucket(STORAGE_BUCKET, { public: true });
    }
    bucketEnsured = true;
  } catch (err) {
    console.error("ensureBucketPublic failed (uploads continue):", err);
  }
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL provided for upload");

  const [, mimeType, base64] = match;
  const binary = Buffer.from(base64, "base64");
  return { blob: new Blob([binary], { type: mimeType }), mimeType };
}

export async function uploadStorageImage(input: StorageUploadInput) {
  validateUploadFile({
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
    path: input.path,
  });

  const client = getSupabaseAdminClient();
  await ensureBucketPublic(client);
  const { blob } = dataUrlToBlob(input.dataUrl);

  const { error } = await client.storage.from(STORAGE_BUCKET).upload(input.path, blob, {
    contentType: input.mimeType,
    upsert: true,
    cacheControl: input.cacheControl || "3600",
  });

  if (error) {
    throw new Error(`Supabase upload failed: ${getSupabaseStorageErrorMessage(error)}`);
  }

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(input.path);

  return {
    bucket: STORAGE_BUCKET,
    path: input.path,
    publicUrl: data.publicUrl,
    mimeType: input.mimeType,
    size: input.size,
  };
}
