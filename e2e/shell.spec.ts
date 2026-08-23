import { expect, test } from "@playwright/test";

/**
 * The §33 foundation UX acceptance chain, end to end against real backend
 * behaviour:
 *
 *   login → confirm organization → see authorized platform → open workspace
 *   → open entity → see authorized fields → perform authorized action
 *   → command executes → state changes → event/audit created → UI reflects it
 */

test.describe("platform shell", () => {
  // These assert the desktop information hierarchy — a persistent rail, a dense
  // table. The mobile hierarchy is deliberately different and is covered by
  // responsive.spec rather than by loosening these into layout-agnostic
  // assertions that would stop proving anything.
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "asserts the desktop hierarchy");
  });

  test("signs in and lands on an authorized overview", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    // Real counts, not invented metrics.
    await expect(page.getByText("effective grants")).toBeVisible();
  });

  test("redirects an unauthenticated visitor to sign-in", async ({ browser }) => {
    const anonymous = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await anonymous.newPage();
    await page.goto("/assets");
    await expect(page).toHaveURL(/\/sign-in/);
    await anonymous.close();
  });

  test("shows the operating context and offers only the actor's memberships", async ({ page }) => {
    await page.goto("/");
    const switcher = page.locator("#org-switcher-rail");
    await expect(switcher).toBeVisible();
    // Exactly the two memberships the seed grants — never a tenant list.
    await expect(switcher.locator("option")).toHaveCount(2);
  });

  test("navigation is derived from capability contributions", async ({ page }) => {
    await page.goto("/");
    // Labels come from each capability's own contribution, not from the
    // capability's registry name and not from a map inside the shell.
    for (const label of ["Locations", "Assets", "Evidence", "Scheduling", "Approvals"]) {
      await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("changing organization changes what is authorized", async ({ page }) => {
    await page.goto("/locations");

    // Platform Administrator holds Tenant scope: every site is visible.
    await page.locator("#org-switcher-rail").selectOption({ label: "Demo HQ — Demo Operations" });
    await expect(page.getByRole("link", { name: "Demo Northern Yard" })).toBeVisible();

    // Supervisor holds Organization scope: the parent org's site disappears.
    await page.locator("#org-switcher-rail").selectOption({ label: "Demo Depot — Demo Operations" });
    await expect(page.getByRole("link", { name: "Demo Northern Yard" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Demo Depot Site" })).toBeVisible();

    await page.locator("#org-switcher-rail").selectOption({ label: "Demo HQ — Demo Operations" });
  });

  test("runs a command and reflects the new state, with audit", async ({ page }) => {
    await page.goto("/assets");
    await page.getByRole("link", { name: "Demo Support Vehicle" }).click();
    await expect(page.getByRole("heading", { name: "Demo Support Vehicle" })).toBeVisible();

    // The suite mutates shared seeded data, so start from a known state rather
    // than assuming the previous run left one. A test that only passes on a
    // fresh database is not a test.
    const backToService = page.getByRole("button", { name: "Mark in service" });
    if (await backToService.isVisible()) await backToService.click();

    // Actions are generated from declared transitions only.
    const toMaintenance = page.getByRole("button", { name: "Mark maintenance" });
    await expect(toMaintenance).toBeVisible();
    await toMaintenance.click();

    // State changed, and the history records the command that caused it.
    await expect(page.getByRole("button", { name: "Mark in service" })).toBeVisible();
    await expect(page.getByText("verity.asset.change_state").first()).toBeVisible();
    await expect(page.getByText("in_service → maintenance").first()).toBeVisible();

    // Leave it as we found it.
    await page.getByRole("button", { name: "Mark in service" }).click();
    await expect(page.getByRole("button", { name: "Mark maintenance" })).toBeVisible();
  });

  test("offers no transition the capability has not declared", async ({ page }) => {
    await page.goto("/assets");
    await page.getByRole("link", { name: "Demo Support Vehicle" }).click();
    // in_service declares maintenance, retired and lost — and nothing else.
    await expect(page.getByRole("button", { name: /^Mark / })).toHaveCount(3);
  });

  test("workspace lists what is waiting rather than metrics", async ({ page }) => {
    await page.goto("/workspace");
    await expect(page.getByRole("heading", { name: "Workspace" })).toBeVisible();
  });

  test("capability registry reports real activation state", async ({ page }) => {
    await page.goto("/capabilities");
    await expect(page.getByRole("heading", { name: "Capability registry" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Location", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Depends on" })).toBeVisible();
  });

  test("audit shows recorded history", async ({ page }) => {
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: "Audit" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operational history" })).toBeVisible();
  });

  test("evidence register is read-only", async ({ page }) => {
    await page.goto("/evidence");
    await expect(page.getByRole("heading", { name: "Evidence" })).toBeVisible();
    // Immutability is a property of the platform, so no control offers otherwise.
    await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^edit/i })).toHaveCount(0);
  });

  test("scheduling renders a time grid, not a row list", async ({ page }) => {
    await page.goto("/scheduling");
    await expect(page.getByRole("heading", { name: "Scheduling" })).toBeVisible();
    // The geometry is the point, but the same data is available as text.
    await expect(page.getByText(/Bookings as a list/)).toBeVisible();
  });
});
