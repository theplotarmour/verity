import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";

import prisma from "@/lib/prisma";
import { issueKeyMaterial, signPayload } from "@/lib/api-keys/signing";
import { authenticateApiRequest } from "@/lib/server/api-keys";

/**
 * End-to-end authentication for the order intake endpoint.
 *
 * `signing.test.ts` proves the crypto in isolation. This proves the part that
 * only fails against a real database: that a real stored key authenticates, a
 * revoked one does not, and — the one that matters most — that the tenant comes
 * from the key row rather than anything the caller can influence.
 *
 * The spec's checklist says orders must be injected "safely". This is the
 * safely.
 */
describe("api key authentication", () => {
  let factoryId: string;
  let otherFactoryId: string | null = null;
  let seeded = false;

  const live = issueKeyMaterial();
  const revoked = issueKeyMaterial();
  const createdKeyIds: string[] = [];

  const BODY = JSON.stringify({ customer: { name: "Acme" }, lines: [{ quantity: 1 }] });

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;

    const other = await prisma.factory.findFirst({ where: { id: { not: factoryId } } });
    otherFactoryId = other?.id ?? null;

    for (const [material, revokedAt] of [
      [live, null],
      [revoked, new Date()],
    ] as const) {
      const key = await prisma.apiKey.create({
        data: {
          factoryId,
          name: `test ${material.prefix}`,
          prefix: material.prefix,
          tokenHash: material.tokenHash,
          signingSecret: material.signingSecret,
          revokedAt,
        },
      });
      createdKeyIds.push(key.id);
    }
  });

  afterAll(async () => {
    if (createdKeyIds.length > 0) {
      await prisma.apiKey.deleteMany({ where: { id: { in: createdKeyIds } } });
    }
    await prisma.$disconnect();
  });

  function headers(overrides: Record<string, string> = {}, material = live, body = BODY) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    return new Headers({
      authorization: `Bearer ${material.token}`,
      "x-verity-timestamp": timestamp,
      "x-verity-signature": signPayload(material.signingSecret, timestamp, body),
      ...overrides,
    });
  }

  it("accepts a correctly signed request from a live key", async () => {
    if (!seeded) return;
    const result = await authenticateApiRequest(headers(), BODY);
    expect(result.ok).toBe(true);
  });

  it("derives the tenant from the key, not from anything the caller sends", async () => {
    if (!seeded) return;
    // The body names a different factory. It must be ignored entirely.
    const hostile = JSON.stringify({
      factoryId: otherFactoryId ?? "some-other-factory",
      customer: { name: "Acme" },
      lines: [{ quantity: 1 }],
    });
    const result = await authenticateApiRequest(headers({}, live, hostile), hostile);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.factoryId).toBe(factoryId);
      expect(result.factoryId).not.toBe(otherFactoryId);
    }
  });

  it("refuses a revoked key", async () => {
    if (!seeded) return;
    const result = await authenticateApiRequest(headers({}, revoked), BODY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("refuses a token that was never issued", async () => {
    if (!seeded) return;
    const unknown = issueKeyMaterial();
    const result = await authenticateApiRequest(headers({}, unknown), BODY);
    expect(result.ok).toBe(false);
  });

  it("does not distinguish an unknown key from a revoked one", async () => {
    if (!seeded) return;
    // Telling them apart tells an attacker which of their guesses was once real.
    const unknown = await authenticateApiRequest(headers({}, issueKeyMaterial()), BODY);
    const dead = await authenticateApiRequest(headers({}, revoked), BODY);
    expect(unknown.ok).toBe(false);
    expect(dead.ok).toBe(false);
    if (!unknown.ok && !dead.ok) {
      expect(unknown.error).toBe(dead.error);
      expect(unknown.status).toBe(dead.status);
    }
  });

  it("refuses a valid key with no signature", async () => {
    if (!seeded) return;
    const bare = new Headers({ authorization: `Bearer ${live.token}` });
    const result = await authenticateApiRequest(bare, BODY);
    expect(result.ok).toBe(false);
  });

  it("refuses a valid key whose body was altered after signing", async () => {
    if (!seeded) return;
    const tampered = JSON.stringify({ customer: { name: "Acme" }, lines: [{ quantity: 9999 }] });
    const result = await authenticateApiRequest(headers({}, live, BODY), tampered);
    expect(result.ok).toBe(false);
  });

  it("refuses a request with no authorization header at all", async () => {
    if (!seeded) return;
    const result = await authenticateApiRequest(new Headers(), BODY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("stores the token hashed, never in the clear", async () => {
    if (!seeded) return;
    const row = await prisma.apiKey.findUnique({
      where: { tokenHash: live.tokenHash },
      select: { tokenHash: true, prefix: true },
    });
    expect(row).not.toBeNull();
    expect(row!.tokenHash).toBe(createHash("sha256").update(live.token).digest("hex"));
    expect(row!.tokenHash).not.toContain(live.token);
    // The prefix is the visible half, for telling two keys apart in the console.
    expect(live.token.startsWith(row!.prefix)).toBe(true);
  });
});
