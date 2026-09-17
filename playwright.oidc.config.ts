import { defineConfig, devices } from "@playwright/test";

/**
 * Separate from `playwright.config.ts` on purpose: the default config's
 * `globalSetup` signs in through the Supabase password form and its
 * `webServer` runs `npm run dev` — neither applies here. This targets the
 * WP-09 lab's docker-compose `web` container (already running, OIDC-only)
 * and has no storage-state fixture, because signing in IS the thing under
 * test.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /oidc-.*\.spec\.ts/,
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  // No webServer block: the lab's compose stack starts `web` itself, and this
  // suite must exercise the actual container, not a dev-mode process.
});
