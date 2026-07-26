import "server-only";

export const STORAGE_BUCKET = process.env.SUPABASE_MEDIA_BUCKET?.trim() || "factory-media";

export const STORAGE_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const STORAGE_ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);

export const STORAGE_MAX_BYTES = 5 * 1024 * 1024;

// --- QC video --------------------------------------------------------------
// Videos never travel through a server action (a 30–60s phone clip would blow
// past the body limit); they go straight to Supabase via a signed upload URL,
// so these limits are enforced when minting that URL.
export const VIDEO_ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime", // iOS .mov
  "video/webm",
]);

export const VIDEO_ALLOWED_EXTENSIONS = new Set(["mp4", "mov", "webm"]);

// No fixed length: the operator records for as long as the walkthrough needs.
// The size cap is generous (a few minutes of phone video) — anything larger is
// the client's cue to compress before upload rather than a hard rejection of a
// legitimately long clip.
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
