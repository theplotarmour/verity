import { describe, expect, it } from "vitest";
import {
  createOidcAuthorization,
  createOidcSession,
  oidcStateHash,
  readOidcSession,
  readOidcTransaction,
  renewOidcSessionIfNeeded,
} from "./oidc-browser";
import type { OidcSettings } from "./oidc";

const settings: OidcSettings = {
  issuer: "https://identity.example.test/realms/verity",
  clientId: "verity-web",
  redirectUri: "https://verity.example.test/api/auth/oidc/callback",
  principalClaim: "sub",
  emailClaim: "email",
  clockToleranceSeconds: 0,
  sessionMaxAgeSeconds: 7200,
  sessionIdleSeconds: 3600,
};
const secret = "test-session-secret-long-enough-for-hmac";
const metadata = {
  issuer: settings.issuer,
  authorization_endpoint: `${settings.issuer}/authorize`,
  token_endpoint: `${settings.issuer}/token`,
  jwks_uri: `${settings.issuer}/keys`,
};
const fetchImpl = async () => new Response(JSON.stringify(metadata), {
  status: 200,
  headers: { "content-type": "application/json" },
});

describe("OIDC browser transaction", () => {
  it("builds authorization code + PKCE and binds a safe return path", async () => {
    const created = await createOidcAuthorization(settings, secret, "/workspace", fetchImpl);
    const url = new URL(created.url);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("nonce")).toBe(created.transaction.nonce);
    expect(url.searchParams.get("state")).toBe(created.transaction.state);

    await expect(
      readOidcTransaction(created.transactionCookie, settings, secret),
    ).resolves.toMatchObject({ returnTo: "/workspace" });
  });

  it("rejects a tampered transaction and neutralizes open redirects", async () => {
    const created = await createOidcAuthorization(settings, secret, "//evil.example", fetchImpl);
    await expect(
      readOidcTransaction(`${created.transactionCookie}x`, settings, secret),
    ).rejects.toThrow();
    await expect(
      readOidcTransaction(created.transactionCookie, settings, secret),
    ).resolves.toMatchObject({ returnTo: "/" });
    expect(oidcStateHash(created.transaction.state)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("OIDC application session", () => {
  it("round-trips only the provider-neutral principal", async () => {
    const token = await createOidcSession(
      { id: "11111111-1111-4111-8111-111111111111", email: "person@example.test" },
      settings,
      secret,
    );
    await expect(readOidcSession(token, settings, secret)).resolves.toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      email: "person@example.test",
    });
  });

  it("rejects session tampering", async () => {
    const token = await createOidcSession({ id: "u", email: null }, settings, secret);
    await expect(readOidcSession(`${token}x`, settings, secret)).rejects.toThrow();
  });

  it("renews near idle expiry without extending the absolute lifetime", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await createOidcSession({ id: "u", email: null }, settings, secret);
    await expect(
      renewOidcSessionIfNeeded(token, settings, secret, now + 2_000),
    ).resolves.toMatchObject({ maxAge: 3_600 });
    await expect(
      renewOidcSessionIfNeeded(token, settings, secret, now + 7_201),
    ).rejects.toThrow();
  });
});
