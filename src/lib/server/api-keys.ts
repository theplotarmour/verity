import "server-only";

import prisma from "@/lib/prisma";
import { hashToken, verifySignature } from "@/lib/api-keys/signing";

export { issueKeyMaterial, hashToken, signPayload } from "@/lib/api-keys/signing";
export type { IssuedKey } from "@/lib/api-keys/signing";

/**
 * API key authentication for the headless ingest endpoint.
 *
 * The threat this is built against is not a clever attacker — it is an ordinary
 * one who finds a token in a Shopify app's log, a CI environment dump, or a
 * screenshot attached to a support ticket. So:
 *
 *  - the token is stored as a hash, because a database dump should not also be a
 *    set of live credentials;
 *  - a valid token alone is not enough: the body must carry an HMAC signed with
 *    a separate secret, so a leaked token cannot inject orders on its own and a
 *    captured request cannot be replayed with a modified body;
 *  - the tenant comes from the key row, never from the payload.
 *
 * The crypto itself is in `lib/api-keys/signing.ts`, which has no `server-only`
 * import and is tested directly.
 */

export type AuthFailure = { ok: false; status: number; error: string };
export type AuthSuccess = {
  ok: true;
  apiKeyId: string;
  /** The ONLY source of tenancy for an inbound request. */
  factoryId: string;
};

/**
 * Authenticate an inbound request against a stored key.
 *
 * `rawBody` must be the exact bytes received. Re-serialising parsed JSON gives
 * different bytes — key order, whitespace, number formatting — and every
 * signature would fail for a reason nobody could debug.
 */
export async function authenticateApiRequest(
  headers: Headers,
  rawBody: string,
): Promise<AuthSuccess | AuthFailure> {
  const authorization = headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!token) {
    return { ok: false, status: 401, error: "Missing bearer token." };
  }

  const key = await prisma.apiKey.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, factoryId: true, signingSecret: true, revokedAt: true },
  });

  // Same message and status for "no such key" and "revoked key". Distinguishing
  // them tells an attacker which of their guesses was once real.
  if (!key || key.revokedAt) {
    return { ok: false, status: 401, error: "Invalid or revoked API key." };
  }

  const verdict = verifySignature({
    secret: key.signingSecret,
    signature: headers.get("x-verity-signature") ?? "",
    timestamp: headers.get("x-verity-timestamp") ?? "",
    rawBody,
  });
  if (!verdict.ok) {
    return { ok: false, status: 401, error: verdict.reason };
  }

  return { ok: true, apiKeyId: key.id, factoryId: key.factoryId };
}

/**
 * Record use. Kept off the caller's critical path — a failed bookkeeping write
 * must never reject an otherwise valid order.
 */
export async function touchApiKey(apiKeyId: string): Promise<void> {
  await prisma.apiKey
    .update({ where: { id: apiKeyId }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);
}
