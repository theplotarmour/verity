export function getSupabaseStorageErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "Unknown storage error";

  const maybeError = error as {
    message?: string;
    name?: string;
    statusCode?: number;
    details?: string;
    hint?: string;
  };

  return [
    maybeError.message,
    maybeError.details,
    maybeError.hint,
    maybeError.name ? `[${maybeError.name}]` : null,
    typeof maybeError.statusCode === "number" ? `status ${maybeError.statusCode}` : null,
  ]
    .filter(Boolean)
    .join(" | ") || "Unknown storage error";
}
