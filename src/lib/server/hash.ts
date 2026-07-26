import { createHmac, createHash } from "node:crypto";

const secretKey = process.env.JWT_SECRET || "fallback-secret-key-for-dev";

// Environment-independent PIN hash (factory-salted). Using an env secret
// here caused every environment (local, Vercel) to produce different
// hashes for the same PIN, breaking logins whenever a PIN was set from a
// different environment. 4-digit PINs are guarded by lockout, not hash
// secrecy, so the deterministic hash is the right trade-off.
// NOTE: the "veda:" prefix below is a hash input, not branding. It survived
// the Verity rebrand on purpose — renaming it changes every derived digest and
// would lock out every existing user, with no migration path since the PINs
// themselves are not recoverable. Leave it alone.
export function hashPin(pin: string, factoryId: string) {
  return createHash("sha256").update(`veda:${factoryId}:${pin}`).digest("hex");
}

// Old scheme (HMAC with the env secret) - still checked on login so
// existing users migrate transparently.
export function legacyHashPin(pin: string, factoryId: string) {
  return createHmac("sha256", secretKey)
    .update(`${factoryId}:${pin}`)
    .digest("hex");
}
