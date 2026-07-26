import { createHmac, createHash } from "node:crypto";

const secretKey = process.env.JWT_SECRET || "fallback-secret-key-for-dev";

// Environment-independent PIN hash (factory-salted). Using an env secret
// here caused every environment (local, Vercel) to produce different
// hashes for the same PIN, breaking logins whenever a PIN was set from a
// different environment. 4-digit PINs are guarded by lockout, not hash
// secrecy, so the deterministic hash is the right trade-off.
export function hashPin(pin: string, factoryId: string) {
  return createHash("sha256").update(`verity:${factoryId}:${pin}`).digest("hex");
}

// Superseded schemes, still checked at login and on PIN change so existing
// users migrate transparently to the current hash on their next successful
// entry. A stored PIN is not recoverable, so these are the only migration
// path — do not delete them until every row has been observed to roll over.
const SUPERSEDED_HASHES: Array<(pin: string, factoryId: string) => string> = [
  // Pre-rebrand salt. Identical scheme, "veda:" prefix.
  (pin, factoryId) => createHash("sha256").update(`veda:${factoryId}:${pin}`).digest("hex"),
  // Original scheme: HMAC keyed on the env secret.
  (pin, factoryId) => createHmac("sha256", secretKey).update(`${factoryId}:${pin}`).digest("hex"),
];

/**
 * True when `storedHash` matches `pin` under any retired scheme. A user with
 * no PIN set (null hash) never matches — otherwise an empty credential would
 * authenticate against an empty stored value.
 */
export function matchesLegacyPin(pin: string, factoryId: string, storedHash: string | null) {
  if (!storedHash) return false;
  return SUPERSEDED_HASHES.some((scheme) => scheme(pin, factoryId) === storedHash);
}

/**
 * @deprecated Prefer {@link matchesLegacyPin}, which covers every retired
 * scheme rather than just the HMAC one. Kept as a thin shim for callers that
 * still compare a single digest.
 */
export function legacyHashPin(pin: string, factoryId: string) {
  return SUPERSEDED_HASHES[1](pin, factoryId);
}
