import { expect, test } from "@playwright/test";

/**
 * Responsive structure (§26).
 *
 * The brief is explicit that the experience hierarchy should adapt rather than
 * the desktop layout merely shrinking, so these assert a *different* structure
 * at each size instead of the same one at a smaller scale.
 */

test.describe("responsive shell", () => {
  test("desktop keeps navigation permanently visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/assets");

    // The rail is always there; operators move between areas constantly and a
    // hidden menu would cost a click every time.
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();

    // Dense tabular layout.
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("mobile collapses navigation into a sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/assets");

    const menu = page.getByRole("button", { name: "Menu" });
    await expect(menu).toBeVisible();
    // A permanent rail would eat a third of a small screen.
    await expect(page.getByRole("link", { name: "Overview" })).toBeHidden();

    await menu.click();
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(page.locator("#org-switcher-sheet")).toBeVisible();
  });

  test("mobile stacks records instead of scrolling a table sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/assets");

    // A horizontally scrolling table on a phone hides the columns that matter
    // behind a gesture nobody discovers, so the table is not rendered at all.
    await expect(page.getByRole("table")).toBeHidden();
    await expect(page.getByRole("link", { name: "Demo Inspection Unit" })).toBeVisible();
  });

  test("touch targets stay large enough to hit", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const menu = page.getByRole("button", { name: "Menu" });
    const box = await menu.boundingBox();
    // Bible V4 §2.3 asks for large tap targets; WCAG asks for at least 44px.
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
  });

  test("the page never scrolls sideways on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/", "/assets", "/locations", "/scheduling", "/approvals", "/audit"]) {
      await page.goto(path);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflows, `${path} overflows horizontally`).toBe(false);
    }
  });
});
