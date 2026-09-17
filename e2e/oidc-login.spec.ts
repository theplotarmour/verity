import { test, expect } from "@playwright/test";

/**
 * WP-09 §"Authentication/session" track, WP-05's exit criterion ("a fresh
 * IdP/Supabase lab completes the full browser lifecycle"). Runs only inside
 * the WP-09 lab (`wp09-enterprise-lab.yml`), against a real Dex instance —
 * not the in-process pure OIDC tests (`oidc-provider.test.ts`), which prove
 * the token-verification boundary but deliberately never drive a browser.
 *
 * Dex's static-password login form selectors are asserted by role/label
 * where possible; this is the one file in the lab least protected by prior
 * execution and most likely to need a selector adjustment on the first real
 * CI run — flagging that here rather than presenting it as proven.
 */

const LAB_EMAIL = "operator@verity-lab.test";
const LAB_PASSWORD = process.env.DEX_LAB_PASSWORD ?? "";

test("completes the OIDC authorization-code + PKCE browser lifecycle: login, session, logout", async ({ page }) => {
  test.skip(!LAB_PASSWORD, "DEX_LAB_PASSWORD not set — only runs inside the WP-09 lab job");

  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Continue with organization sign-in" }).click();

  // Redirected to Dex. Its static-password connector form: an email/login
  // field and a password field, submitted by a "Login" button.
  await page.waitForURL(/dex/);
  await page.getByLabel(/login|email/i).fill(LAB_EMAIL);
  await page.getByLabel(/password/i).fill(LAB_PASSWORD);
  await page.getByRole("button", { name: /login|sign in/i }).click();

  // Dex may show a one-time "Grant Access" consent screen for a new client.
  const grantButton = page.getByRole("button", { name: /grant access/i });
  if (await grantButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await grantButton.click();
  }

  // Back on Verity, authenticated — the callback route redirects into the shell.
  await page.waitForURL((url) => !url.href.includes("dex") && !url.pathname.startsWith("/sign-in"), { timeout: 30_000 });
  await expect(page.locator("body")).not.toContainText("could not complete sign-in");

  // Logout clears the local session and, per WP-05's requirement, covers
  // provider-side logout too — asserted here as "returns to sign-in",
  // the externally observable contract.
  await page.goto("/api/auth/oidc/logout");
  await page.waitForURL(/\/sign-in/, { timeout: 15_000 });
});

test("refuses an unprovisioned OIDC subject rather than silently linking one", async ({ page }) => {
  // A second Dex static user with no matching Party/User row would need to be
  // added to reach this path end-to-end; left as a documented gap rather than
  // a guessed selector sequence against a user that does not exist yet in
  // dex-config.yaml.tmpl. The server-side refusal itself IS covered — the
  // OIDC callback route's `memberships_for_auth_user` lookup throws for any
  // unknown subject, which is exercised directly by this repo's integration
  // suite, not duplicated here.
  test.fixme(true, "requires a second, deliberately unprovisioned Dex static user — not yet added to dex-config.yaml.tmpl");
});
