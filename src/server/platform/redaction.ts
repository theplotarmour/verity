/**
 * Runtime-neutral text redaction shared by Node, Edge, and browser telemetry.
 * Keep this module free of Node-only imports so telemetry scrubbing cannot pull
 * integration cryptography into Edge or client bundles.
 */
export function redactMessage(message: string): string {
  return message
    .replace(/:\/\/[^\s/@]+:[^\s/@]+@/g, "://[redacted]@")
    .replace(/(Bearer|Basic)\s+[A-Za-z0-9._\-+/=]+/gi, "$1 [redacted]")
    .replace(/((?:api[-_]?key|access[-_]?token|token|secret|password|signature)["'\s:=]+)[^\s,;"'&]+/gi, "$1[redacted]");
}
