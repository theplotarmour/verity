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

  // Pin the operating context to the seeded client rather than inheriting
  // whichever membership happens to sort first.
  //
  // With no stored choice, `resolveActor` falls back to the first membership by
  // tenant name — which was fine when this account held two, and stopped being
  // fine the moment HQ existed: administering a client grants the operator a
  // membership there (ADR-013), so the account accumulates them and the default
  // context becomes an accident of alphabetical order. The suite asserts against
  // the seeded client's data, so it should say so instead of relying on luck.
  const switcher = page.locator("#org-switcher-header");
  if (await switcher.count()) {
    const options = await switcher.locator("option").allTextContents();
    const demo = options.find((option) => option.includes("Demo"));
    if (demo) {
      await switcher.selectOption({ label: demo });
      // The switch is a server action plus a refresh, with no navigation to wait
      // for. Wait for the control to settle on the chosen value before the
      // cookie is captured, or the stored state may predate it.
      await page.waitForFunction(
        (label) => {
          const select = document.querySelector<HTMLSelectElement>("#org-switcher-header");
          if (!select) return false;
          return select.options[select.selectedIndex]?.textContent?.trim() === label.trim();
        },
        demo,
        { timeout: 15_000 },
      );
    }
  }

  await page.context().storageState({ path: "./e2e/.auth/platform.json" });
  await browser.close();
}

export default globalSetup;
