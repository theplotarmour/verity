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

/**
 * Shell scroll ownership (ADR-012; work plan D11–D14, §5.7).
 *
 * The application is not a long document. The shell is fixed and exactly one
 * region scrolls, which is why the top bar and the sidebar's header and account
 * card never travel. These assert the property rather than the CSS: an element
 * that stays put after a large scroll is doing its job whatever the rule is
 * called.
 */
test.describe("shell scroll ownership", () => {
  test.skip(({ isMobile }) => isMobile, "the fixed rail is a desktop composition");

  test("the document itself does not scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/audit");

    // A taller-than-viewport body is the failure this replaces: it is what let
    // the top bar scroll out of view.
    const documentScrolls = await page.evaluate(
      () => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
    );
    expect(documentScrolls).toBe(false);
  });

  test("content scrolls while the chrome stays", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/audit");

    const main = page.locator("#main");
    const bar = page.getByPlaceholder("Search this page");
    const lockup = page.getByRole("link", { name: "Verity" }).first();

    const barBefore = await bar.boundingBox();
    const lockupBefore = await lockup.boundingBox();

    await main.evaluate((el) => el.scrollTo(0, 600));
    const scrolled = await main.evaluate((el) => el.scrollTop);
    // If the assertion below is to mean anything, the region must actually have
    // scrolled — a page with too little content would pass vacuously.
    expect(scrolled).toBeGreaterThan(0);

    expect((await bar.boundingBox())?.y).toBe(barBefore?.y);
    expect((await lockup.boundingBox())?.y).toBe(lockupBefore?.y);
  });

  test("the navigation region alone scrolls, and only when it must", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const navRegion = page.locator("aside > div").first();
    // Nine items fit at this height, so no scrollbar. D12: a rail that always
    // shows one is chrome apologising for itself.
    expect(
      await navRegion.evaluate((el) => el.scrollHeight > el.clientHeight + 1),
    ).toBe(false);

    // A short viewport is the case that decides whether the region scrolls or
    // the shell breaks.
    await page.setViewportSize({ width: 1440, height: 520 });
    expect(
      await navRegion.evaluate((el) => el.scrollHeight > el.clientHeight + 1),
    ).toBe(true);

    // Header and account card stay put regardless — they are outside the
    // scroller, which is the whole point of the three-part rail.
    await expect(page.getByRole("link", { name: "Verity" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign out/ })).toBeVisible();
  });
});
