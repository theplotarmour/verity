import { expect, test } from "@playwright/test";

/**
 * Accessibility (§30).
 *
 * Automated checks cannot prove an interface is accessible, but they can prove
 * these specific things are not broken: landmarks exist, the skip link works,
 * every input has a label, state is not communicated by colour alone, and the
 * keyboard can reach the primary content.
 */

test.describe("accessibility", () => {
  test("exposes landmarks and a working skip link", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();

    // On mobile the navigation lives in a sheet, so it is a landmark only once
    // opened. That is the intended hierarchy, not a missing landmark.
    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Menu" }).click();
    }
    await expect(page.getByRole("navigation", { name: "Platform" }).first()).toBeVisible();

    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  test("every form control has an accessible name", async ({ page }) => {
    await page.goto("/locations");
    await page.getByRole("button", { name: "New location" }).click();

    for (const control of await page.locator("input:visible, select:visible").all()) {
      const name =
        (await control.getAttribute("aria-label")) ??
        (await control.evaluate((el) => {
          const id = el.getAttribute("id");
          return id ? document.querySelector(`label[for="${id}"]`)?.textContent : null;
        }));
      expect(name?.trim()).toBeTruthy();
    }
  });

  test("state is never communicated by colour alone", async ({ page }) => {
    await page.goto("/assets");
    // Whatever state each asset happens to be in, the badge spells it out — a
    // red dot and a green dot are the same dot in greyscale.
    const badge = page.locator("table tbody tr td").last();
    await expect(badge).toContainText(/in_service|maintenance|retired|lost/);
  });

  test("tables carry a caption for screen readers", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/assets");
    await expect(page.locator("table caption")).toHaveCount(1);
  });

  test("sortable headers are real buttons with sort state", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/assets");

    const header = page.getByRole("button", { name: "Asset" });
    await header.click();
    await expect(page.locator("th[aria-sort]")).toHaveCount(1);
  });

  test("an error is announced, not merely coloured", async ({ browser }) => {
    const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await anonymous.newPage();
    await page.goto("/sign-in");

    await page.getByLabel("Email").fill("nobody@demo.verity.local");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await anonymous.close();
  });
});
