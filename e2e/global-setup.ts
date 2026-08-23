import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";

/**
 * Signs in once and stores the session for every spec.
 *
 * Uses the real sign-in form rather than injecting a cookie, so the
 * authentication path itself is covered on every run — if sign-in breaks, the
 * whole suite fails loudly at setup instead of quietly running unauthenticated.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  mkdirSync("./e2e/.auth", { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("admin@demo.verity.local");
  await page.getByLabel("Password").fill("verity-demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("/", { timeout: 30_000 });
  await page.context().storageState({ path: "./e2e/.auth/platform.json" });
  await browser.close();
}

export default globalSetup;
