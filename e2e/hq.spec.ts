import { expect, test, type Page } from "@playwright/test";

/**
 * Verity HQ — the four workflows, walked through the interface with no SQL.
 *
 * Work plan §6.7 defines these, and the point of asserting them in a browser
 * rather than only in the runtime tests is D20: "a Verity team member can
 * onboard and manage a real client entirely through HQ, without asking a
 * developer to edit SQL or application code". A function that works is not the
 * same claim as a screen someone can actually use.
 *
 * Desktop only. HQ is an operator console with a fixed rail; the mobile project
 * asserts a different structure and there is nothing to gain from running the
 * same flow twice at a width nobody administers a platform from.
 */

test.describe("Verity HQ", () => {
  test.skip(({ isMobile }) => isMobile, "HQ is a desktop operator console");

  /** A name nothing else will collide with, so runs do not depend on order. */
  const stamp = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  /** The client tab strip, so a tab click is never ambiguous with a body link. */
  const tab = (page: Page, name: string) =>
    page.getByRole("navigation", { name: "Client administration" }).getByRole("link", { name });

  async function enterHq(page: Page) {
    // The signed-in fixture holds several memberships. HQ requires the ACTIVE
    // one to be the platform tenant — operator authority is deliberately not
    // ambient (ADR-013 answer 3), so an operator working inside a client is
    // refused until they switch back.
    await page.goto("/");
    const switcher = page.locator("#org-switcher-header");
    const platformOption = (await switcher.locator("option").allTextContents()).find((o) =>
      o.includes("Verity Platform"),
    );
    if (!platformOption) test.skip(true, "this installation has no platform tenant bootstrapped");
    await switcher.selectOption({ label: platformOption! });

    // The switch is a server action that sets a cookie and then refreshes; there
    // is no navigation to wait for, so waiting on a URL would return instantly
    // and land on /hq with the old context still active. Poll the destination
    // instead — the only signal that actually means "the switch took effect".
    await expect(async () => {
      await page.goto("/hq");
      await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 30_000 });
  }

  test("A — onboards a client end to end: create, enable, organize, invite, assign", async ({
    page,
  }) => {
    test.slow();
    await enterHq(page);

    const clientName = `Workflow A ${stamp()}`;

    // 1. Create the client.
    await page.goto("/hq/clients");
    await page.getByRole("button", { name: "New client" }).click();
    await page.getByLabel("Client name").fill(clientName);
    await page.getByRole("button", { name: "Create client" }).click();
    await expect(page.getByRole("link", { name: clientName })).toBeVisible();

    // 2. Open it.
    await page.getByRole("link", { name: clientName }).click();
    await expect(page.getByRole("heading", { name: clientName })).toBeVisible();

    // 3. Enable a module. Nothing is enabled by default, deliberately.
    await tab(page, "Modules").click();
    // Targeted by the button's own accessible name: several rows mention this
    // capability id, because other capabilities DEPEND on it, and matching on
    // the id alone would pick one of those instead.
    await expect(page.getByRole("button", { name: "Enable Location" })).toBeVisible();
    await page.getByRole("button", { name: "Enable Location" }).click();
    await expect(page.getByRole("button", { name: "Disable Location" })).toBeVisible();

    // 4. Add an organization under the root.
    await tab(page, "Organizations").click();
    await page.getByRole("button", { name: "New organization" }).click();
    await page.getByLabel(/^Name/).fill("North Depot");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByRole("cell", { name: /North Depot/ })).toBeVisible();

    // 5. Create a role and give it something real.
    await tab(page, "Roles").click();
    await page.getByRole("button", { name: "New role" }).click();
    await page.getByLabel("Role name").fill("Depot Lead");
    await page.getByRole("button", { name: "Create", exact: true }).click();

    const roleCard = page.locator("section, div").filter({ hasText: "Depot Lead" }).last();
    await expect(roleCard).toBeVisible();
    await page.getByRole("button", { name: "Manage" }).last().click();
    await page.getByLabel(/^Entity/).last().fill("verity.location.location");
    await page.getByRole("button", { name: "Grant" }).last().click();
    await expect(page.getByText("verity.location.location").last()).toBeVisible();

    // 6. Invite a person into the organization, with that role.
    await tab(page, "People").click();
    await page.getByRole("button", { name: "Invite person" }).click();
    const personName = `Alex ${stamp()}`;
    await page.getByLabel(/^Name/).fill(personName);
    await page.getByLabel("Email").fill(`${personName.replace(/\s+/g, ".")}@example.test`);
    await page.getByLabel(/^Role$/).selectOption({ label: "Depot Lead" });
    await page.getByRole("button", { name: "Invite", exact: true }).click();

    // 7. They exist, with the role, and nothing was typed into a database.
    const personRow = page.getByRole("row").filter({ hasText: personName });
    await expect(personRow).toBeVisible();
    await expect(personRow.getByRole("combobox")).toHaveValue(/.+/);
  });

  test("B — inspects a client and the operation lands in its audit trail", async ({ page }) => {
    test.slow();
    await enterHq(page);

    // Its own client rather than whichever happens to be first. Administering a
    // client grants the operator a membership there (ADR-013), so a test that
    // reached into an arbitrary tenant would leave a real membership behind in
    // it — and the shell's "the switcher lists memberships, not tenants" test
    // would then be asserting against this suite's side effects.
    const clientName = `Workflow B ${stamp()}`;
    await page.goto("/hq/clients");
    await page.getByRole("button", { name: "New client" }).click();
    await page.getByLabel("Client name").fill(clientName);
    await page.getByRole("button", { name: "Create client" }).click();
    await page.getByRole("link", { name: clientName }).click();
    await expect(page.getByRole("heading", { name: clientName })).toBeVisible();

    // People, organizations and roles are all reachable and all read through
    // the ordinary query pipeline as the operator.
    await tab(page, "People").click();
    await expect(page.getByRole("table")).toBeVisible();

    await tab(page, "Organizations").click();
    await expect(page.getByRole("table")).toBeVisible();

    await tab(page, "Roles").click();
    await expect(page.getByText(/resolved/).first()).toBeVisible();

    // A permitted operation: set a configuration value.
    await tab(page, "Settings").click();
    const key = `hq.e2e.${stamp()}`;
    await page.getByLabel("Key").fill(key);
    await page.getByLabel("Value").fill("recorded");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("cell", { name: key })).toBeVisible();

    // And it is visible in the platform audit, marked as an operator action —
    // ADR-013 answer 12.
    await page.goto("/hq/audit");
    const auditRow = page.getByRole("row").filter({ hasText: "verity.platform.set_configuration" });
    await expect(auditRow.first()).toBeVisible();
    await expect(auditRow.first().getByText("Operator")).toBeVisible();
  });

  test("C — switching clients shows the second client's records, never the first's", async ({
    page,
  }) => {
    test.slow();
    await enterHq(page);

    const nameA = `Isolation A ${stamp()}`;
    const nameB = `Isolation B ${stamp()}`;

    for (const name of [nameA, nameB]) {
      await page.goto("/hq/clients");
      await page.getByRole("button", { name: "New client" }).click();
      await page.getByLabel("Client name").fill(name);
      await page.getByRole("button", { name: "Create client" }).click();
      await expect(page.getByRole("link", { name })).toBeVisible();
    }

    // A person who exists only in A.
    await page.getByRole("link", { name: nameA }).click();
    await tab(page, "People").click();
    await page.getByRole("button", { name: "Invite person" }).click();
    const onlyInA = `OnlyInA ${stamp()}`;
    await page.getByLabel(/^Name/).fill(onlyInA);
    await page.getByRole("button", { name: "Invite", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: onlyInA })).toBeVisible();

    // Switch to B and look for them. Not "the filter excludes them" — the query
    // runs inside B's scope and A's rows are not reachable from it at all.
    await page.goto("/hq/clients");
    await page.getByRole("link", { name: nameB }).click();
    await tab(page, "People").click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: onlyInA })).toHaveCount(0);
  });

  test("D — a tenant user cannot reach HQ", async ({ page, context }) => {
    // A fresh context: the shared storage state is the operator's, and reusing
    // it would test nothing.
    const anonymous = await context.browser()?.newContext();
    if (!anonymous) test.skip();
    const visitor = await anonymous!.newPage();

    await visitor.goto("/hq");
    // The property is that HQ does not render, not which page they end up on:
    // the layout redirects a non-operator to the tenant shell, which then sends
    // an unauthenticated visitor to sign-in. Asserting the final URL would be
    // asserting the order of two redirects rather than the boundary.
    await expect(visitor).not.toHaveURL(/\/hq/);
    await expect(visitor.getByText("Platform overview")).toHaveCount(0);
    await expect(visitor.getByText("Verity HQ")).toHaveCount(0);
    await anonymous!.close();

    // And an authenticated operator whose ACTIVE context is a client is refused
    // too, because operator authority is not ambient. This is the same rule the
    // runtime test asserts from the other side.
    await page.goto("/");
    const switcher = page.locator("#org-switcher-header");
    const options = await switcher.locator("option").allTextContents();
    const clientOption = options.find((o) => !o.includes("Verity Platform"));
    if (clientOption) {
      await switcher.selectOption({ label: clientOption });
      await page.waitForURL("/");
      await page.goto("/hq");
      // Redirected out of HQ rather than shown an empty console.
      await expect(page).toHaveURL(/\/$/);
    }
  });
});
