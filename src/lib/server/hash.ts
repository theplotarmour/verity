import { createHmac, createHash } from "node:crypto";
import { signingSecret } from "@/lib/server/secret";

// Environment-independent PIN hash (factory-salted). Using an env secret
// here caused every environment (local, Vercel) to produce different
// hashes for the same PIN, breaking logins whenever a PIN was set from a
// different environment. 4-digit PINs are guarded by lockout, not hash
// secrecy, so the deterministic hash is the right trade-off.
export function hashPin(pin: string, factoryId: string) {
  return createHash("sha256").update(`verity:${factoryId}:${pin}`).digest("hex");
}

// Old scheme (HMAC with the env secret) - still checked on login so
// existing users migrate transparently.
export function legacyHashPin(pin: string, factoryId: string) {
  return createHmac("sha256", signingSecret())
    .update(`${factoryId}:${pin}`)
    .digest("hex");
}
