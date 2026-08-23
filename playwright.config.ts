import { defineConfig, devices } from "@playwright/test";

/**
 * Browser coverage for the platform shell.
 *
 * Deliberately small: these catch the class of regression a unit test cannot
 * see — a page that 500s, a form that resets its own state, a layout that
 * hides its navigation on a phone. They run against a real dev server and the
 * seeded database, so they exercise the actual command pipeline rather than a
 * mock of it.
 */
export default defineConfig({
  testDir: "./e2e",
  // The suite mutates shared seeded records, so parallel runs would race.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    storageState: "./e2e/.auth/platform.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // §26 requires the hierarchy to adapt, not merely shrink, so the mobile
    // project asserts a different structure rather than the same one smaller.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
