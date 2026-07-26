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
