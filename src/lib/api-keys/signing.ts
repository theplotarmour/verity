import { createHash, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

/**
 * Token minting and HMAC signing for the headless API.
 *
 * Pure, and deliberately free of `server-only` so it can be tested and used by
 * scripts. The database-touching half lives in `lib/server/api-keys.ts`. This is
 * the part where a mistake is invisible — a signature check that accepts
 * everything looks identical to one that works, until someone tries it.
 */

const TOKEN_PREFIX = "vk_live_";
const PREFIX_VISIBLE_CHARS = 12;

/** How far a request's timestamp may be from ours before it is a replay. */
export const MAX_SKEW_SECONDS = 300;

export interface IssuedKey {
  /** Shown once, at creation. Never recoverable afterwards. */
  token: string;
  prefix: string;
  tokenHash: string;
  signingSecret: string;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Mint a token, its lookup prefix, and a separate HMAC secret. */
export function issueKeyMaterial(): IssuedKey {
  const token = `${TOKEN_PREFIX}${randomBytes(24).toString("hex")}`;
  return {
    token,
    prefix: token.slice(0, PREFIX_VISIBLE_CHARS),
    tokenHash: hashToken(token),
    signingSecret: randomBytes(32).toString("hex"),
  };
}

/**
 * The signature for a request body.
 *
 * The timestamp is inside the signed material, so it cannot be edited to widen
 * the replay window without invalidating the signature.
 */
export function signPayload(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

/** Constant-time compare. Length mismatch returns early, which leaks only length. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Shopify's webhook signature.
 *
 * Deliberately its own function rather than a flag on `verifySignature`: it is
 * base64 rather than hex, it signs the body alone with no timestamp, and the
 * secret is the app's shared secret rather than one we minted. Folding those
 * three differences into the main verifier as options is how a subtle mistake
 * ends up applying to both.
 *
 * Note what it does *not* have: a timestamp. Shopify does not send one, so this
 * cannot detect replay on its own — the idempotency record on the ingest path
 * is what stops a replayed order becoming a second order.
 */
export function verifyShopifySignature(args: {
  secret: string;
  /** The raw `X-Shopify-Hmac-Sha256` header, base64. */
  signature: string;
  rawBody: string;
}): boolean {
  if (!args.signature || !args.secret) return false;
  const expected = createHmac("sha256", args.secret).update(args.rawBody, "utf8").digest("base64");
  return safeEqual(args.signature, expected);
}

export type SignatureVerdict = { ok: true } | { ok: false; reason: string };

/**
 * Verify a signature and its freshness together, because neither alone is
 * sufficient: a valid signature on a two-day-old body is a replay, and a fresh
 * timestamp on an unsigned body is nothing at all.
 */
export function verifySignature(args: {
  secret: string;
  signature: string;
  timestamp: string;
  rawBody: string;
  now?: number;
}): SignatureVerdict {
  const { secret, signature, timestamp, rawBody } = args;

  if (!signature || !timestamp) {
    return { ok: false, reason: "Missing X-Verity-Signature or X-Verity-Timestamp." };
  }

  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) {
    return { ok: false, reason: "Malformed X-Verity-Timestamp." };
  }

  const now = args.now ?? Date.now();
  // Both directions: a clock ahead of ours is as much a replay risk as one behind.
  if (Math.abs(now / 1000 - sent) > MAX_SKEW_SECONDS) {
    return { ok: false, reason: "Signature timestamp outside the allowed window." };
  }

  if (!safeEqual(signature, signPayload(secret, timestamp, rawBody))) {
    return { ok: false, reason: "Signature verification failed." };
  }

  return { ok: true };
}
