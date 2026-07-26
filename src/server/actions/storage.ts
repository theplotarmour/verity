"use server";

import { uploadStorageImage as uploadStorageImageImpl, type StorageUploadInput } from "@/lib/storage/upload";

export async function uploadStorageImage(input: StorageUploadInput) {
  return uploadStorageImageImpl(input);
}
