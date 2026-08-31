import { beforeEach, describe, expect, it } from "vitest";
import { SIGN_IN_LIMIT, rateLimit, resetRateLimits, signInKey } from "./rate-limit";

/**
 * Audit finding F-01. These test the properties the finding turns on, not the
 * arithmetic: that the limit actually refuses, that it refuses the right key,
 * and that a window ends.
 */
describe("rate limiting (F-01)", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit and refuses the next attempt", () => {
    const key = "test:allow";
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      expect(rateLimit(key, { limit: 5, windowSeconds: 60 }).allowed).toBe(true);
    }
    const refused = rateLimit(key, { limit: 5, windowSeconds: 60 });
    expect(refused.allowed).toBe(false);
    expect(refused.remaining).toBe(0);
    // A refusal must say when to come back, or a caller cannot tell a user.
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each key separately, so one account cannot lock out another", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      rateLimit("test:a", { limit: 5, windowSeconds: 60 });
    }
    expect(rateLimit("test:a", { limit: 5, windowSeconds: 60 }).allowed).toBe(false);
    expect(rateLimit("test:b", { limit: 5, windowSeconds: 60 }).allowed).toBe(true);
  });

  it("starts a fresh window once the old one has expired", async () => {
    const key = "test:window";
    expect(rateLimit(key, { limit: 1, windowSeconds: 1 }).allowed).toBe(true);
    expect(rateLimit(key, { limit: 1, windowSeconds: 1 }).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(rateLimit(key, { limit: 1, windowSeconds: 1 }).allowed).toBe(true);
  });

  it("folds email casing and surrounding space into one key", () => {
    // Otherwise every casing variant is a fresh allowance, and the limit is
    // defeated by typing the address differently.
    expect(signInKey("  Someone@Example.COM ")).toBe(signInKey("someone@example.com"));
  });

  it("sets a sign-in limit above real use and below an attack", () => {
    // A person who has forgotten a password tries three or four times.
    expect(SIGN_IN_LIMIT.limit).toBeGreaterThanOrEqual(5);
    // Credential stuffing needs volume; this must not supply it.
    expect(SIGN_IN_LIMIT.limit).toBeLessThanOrEqual(20);
    expect(SIGN_IN_LIMIT.windowSeconds).toBeGreaterThanOrEqual(60);
  });
});
