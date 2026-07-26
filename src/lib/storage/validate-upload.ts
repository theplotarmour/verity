import "server-only";

import { STORAGE_ALLOWED_EXTENSIONS, STORAGE_ALLOWED_MIME_TYPES, STORAGE_MAX_BYTES } from "./config";

function mimeTypeToExtension(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "";
  }
}

export function validateUploadFile({
  fileName,
  mimeType,
  size,
  path,
}: {
  fileName?: string;
  mimeType: string;
  size: number;
  path?: string;
}) {
  const extensionFromFile = fileName?.split(".").pop()?.toLowerCase() || "";
  const extensionFromPath = path?.split("/").pop()?.split(".").pop()?.toLowerCase() || "";
  const extensionFromMime = mimeTypeToExtension(mimeType);
  const extension = extensionFromFile || extensionFromPath || extensionFromMime;

  if (!STORAGE_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}. Allowed: jpg, jpeg, png, webp, heic, heif.`);
  }

  if (!STORAGE_ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported file extension: ${extension || "unknown"}. Allowed: jpg, jpeg, png, webp, heic, heif.`);
  }

  if (size > STORAGE_MAX_BYTES) {
    throw new Error(`Image is too large. Maximum allowed size is ${Math.round(STORAGE_MAX_BYTES / 1024 / 1024)} MB.`);
  }
}
