import { describe, it, expect } from "vitest";
import {
  hashToken,
  issueKeyMaterial,
  safeEqual,
  signPayload,
  verifySignature,
  MAX_SKEW_SECONDS,
} from "./signing";

/**
 * Request signing for `/api/orders/receive`.
 *
 * This is the endpoint that writes production work with no signed-in human, so
 * a verifier that accepts everything is indistinguishable from one that works
 * until somebody tries it. Every test below is a specific way to get in.
 */

const SECRET = "a".repeat(64);
const BODY = JSON.stringify({ customer: { name: "Acme" }, lines: [{ quantity: 2 }] });
const now = 1_754_000_000_000;
const ts = Math.floor(now / 1000).toString();

const valid = () => ({
  secret: SECRET,
  signature: signPayload(SECRET, ts, BODY),
  timestamp: ts,
  rawBody: BODY,
  now,
});

describe("verifySignature", () => {
  it("accepts a correctly signed, fresh request", () => {
    expect(verifySignature(valid())).toEqual({ ok: true });
  });

  it("rejects a body edited after signing", () => {
    // The attack this exists for: capture a real request, change the quantity.
    const tampered = JSON.stringify({ customer: { name: "Acme" }, lines: [{ quantity: 9999 }] });
    expect(verifySignature({ ...valid(), rawBody: tampered }).ok).toBe(false);
  });

  it("rejects a signature made with a different secret", () => {
    const other = signPayload("b".repeat(64), ts, BODY);
    expect(verifySignature({ ...valid(), signature: other }).ok).toBe(false);
  });

  it("rejects an empty or missing signature", () => {
    expect(verifySignature({ ...valid(), signature: "" }).ok).toBe(false);
  });

  it("rejects a replay from outside the freshness window", () => {
    const old = Math.floor(now / 1000) - (MAX_SKEW_SECONDS + 60);
    expect(
      verifySignature({
        ...valid(),
        timestamp: String(old),
        signature: signPayload(SECRET, String(old), BODY),
      }).ok,
    ).toBe(false);
  });

  it("rejects a timestamp too far in the future", () => {
    // A clock ahead of ours is as much a replay risk as one behind — a signature
    // dated tomorrow would otherwise stay valid all day.
    const future = Math.floor(now / 1000) + (MAX_SKEW_SECONDS + 60);
    expect(
      verifySignature({
        ...valid(),
        timestamp: String(future),
        signature: signPayload(SECRET, String(future), BODY),
      }).ok,
    ).toBe(false);
  });

  it("accepts a request at the edge of the window", () => {
    const edge = Math.floor(now / 1000) - (MAX_SKEW_SECONDS - 5);
    expect(
      verifySignature({
        ...valid(),
        timestamp: String(edge),
        signature: signPayload(SECRET, String(edge), BODY),
      }).ok,
    ).toBe(true);
  });

  it("rejects a timestamp that is not a number", () => {
    expect(verifySignature({ ...valid(), timestamp: "yesterday" }).ok).toBe(false);
    expect(verifySignature({ ...valid(), timestamp: "" }).ok).toBe(false);
  });

  it("does not let a re-dated timestamp reuse an old signature", () => {
    // The timestamp is inside the signed material precisely so this fails:
    // otherwise an expired capture could be refreshed by editing one header.
    const fresh = Math.floor(now / 1000).toString();
    const oldSignature = signPayload(SECRET, "1700000000", BODY);
    expect(
      verifySignature({ ...valid(), timestamp: fresh, signature: oldSignature }).ok,
    ).toBe(false);
  });

  it("is sensitive to byte-level body differences", () => {
    // Why the route signs the raw text rather than re-serialised JSON: these two
    // parse identically but are different bytes.
    const reordered = JSON.stringify({ lines: [{ quantity: 2 }], customer: { name: "Acme" } });
    expect(reordered).not.toBe(BODY);
    expect(verifySignature({ ...valid(), rawBody: reordered }).ok).toBe(false);
  });
});

describe("issueKeyMaterial", () => {
  it("mints a distinct token and signing secret each time", () => {
    const a = issueKeyMaterial();
    const b = issueKeyMaterial();
    expect(a.token).not.toBe(b.token);
    expect(a.signingSecret).not.toBe(b.signingSecret);
    // Two factors only help if they are actually different values.
    expect(a.token).not.toBe(a.signingSecret);
  });

  it("stores a hash, not the token", () => {
    const key = issueKeyMaterial();
    expect(key.tokenHash).toBe(hashToken(key.token));
    expect(key.tokenHash).not.toContain(key.token);
    expect(key.token.startsWith(key.prefix)).toBe(true);
  });

  it("produces a token long enough not to be guessed", () => {
    expect(issueKeyMaterial().token.length).toBeGreaterThan(40);
  });
});

describe("safeEqual", () => {
  it("compares equal and unequal strings correctly", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
  });

  it("returns false on length mismatch instead of throwing", () => {
    // timingSafeEqual throws on differing lengths; that must not become a 500.
    expect(safeEqual("short", "much longer string")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });
});
