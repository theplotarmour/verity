import { defineConfig, devices } from "@playwright/test";

/**
 * Browser coverage for the critical paths.
 *
 * Deliberately small: these exist to catch the class of regression unit tests
 * cannot see — a dropdown that will not open, a form that resets its own state,
 * a page that 500s. They run against a real dev server and the seeded database.
 */
export default defineConfig({
  testDir: "./e2e",
  // The suite touches shared seeded data, so parallel runs would race.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    storageState: "./e2e/.auth/owner.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
