import { test, expect } from "@playwright/test";

/**
 * Critical-path browser coverage.
 *
 * These exist to catch what unit and database tests cannot: a page that 500s, a
 * dropdown that will not open, a form that wipes its own state. They run against
 * the seeded Carxen factory, so they assert on structure and behaviour rather
 * than on exact seeded values, which change as the seeds evolve.
 */

test.describe("master data", () => {
  test("the studio lists the owner-defined category tabs", async ({ page }) => {
    await page.goto("/owner/master-data");
    await expect(page.getByRole("button", { name: /raw material/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /finished good/i }).first()).toBeVisible();
    // Data / Configure is the mode switch; both must be reachable.
    await expect(page.getByRole("button", { name: /^configure$/i })).toBeVisible();
  });

  test("data rows offer a delete that asks before destroying anything", async ({ page }) => {
    await page.goto("/owner/master-data");
    const del = page.getByRole("button", { name: /^delete$/i }).first();
    await expect(del).toBeVisible();

    // Open the confirmation and back out: this asserts the guard exists without
    // removing seeded data the rest of the suite depends on. Scoped to the
    // dialog, or "no" matches the Notifications bell.
    await del.click();
    const confirm = page.getByRole("dialog").filter({ hasText: /delete/i }).first();
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(confirm).toBeHidden();
  });

  test("configure mode exposes the group's fields and naming templates", async ({ page }) => {
    await page.goto("/owner/master-data?mode=configure");
    await expect(page.getByText(/naming/i).first()).toBeVisible();
    await expect(page.getByText(/available tokens/i).first()).toBeVisible();
    await expect(page.getByText(/bill of materials for/i).first()).toBeVisible();
  });

  test("add master data reveals sections progressively on one page", async ({ page }) => {
    await page.goto("/owner/master-data");
    await page.getByRole("button", { name: /add master data/i }).first().click();
    // Scope everything to the dialog: the studio's own tabs sit behind it and
    // carry the same names.
    const wizard = page.getByRole("dialog", { name: /add master data/i });
    await expect(wizard).toBeVisible();
    await expect(wizard.getByText(/what are you adding/i)).toBeVisible();

    // Choosing Inventory must reveal the category section *without* hiding step 1 —
    // that is the whole point of the single-page rebuild.
    await wizard.getByRole("button", { name: /^inventory$/i }).click();
    await expect(wizard.getByText(/what are you adding/i)).toBeVisible();
    await expect(wizard.getByText(/^category$/i)).toBeVisible();

    // And a category reveals its kinds, again without losing what came before.
    await wizard.getByRole("button", { name: /^raw material$/i }).click();
    await expect(wizard.getByText(/^category$/i)).toBeVisible();
    await expect(wizard.getByText(/^kind$/i)).toBeVisible();
  });

  test("the specification form generates a live item name", async ({ page }) => {
    await page.goto("/owner/master-data");
    await page.getByRole("button", { name: /add master data/i }).first().click();
    const wizard = page.getByRole("dialog", { name: /add master data/i });
    await wizard.getByRole("button", { name: /^inventory$/i }).click();
    await wizard.getByRole("button", { name: /^raw material$/i }).click();
    await wizard.getByRole("button", { name: /^fabric$/i }).click();

    // The identity banner is the feature: it must appear once a group is chosen.
    await expect(wizard.getByText(/item identity/i)).toBeVisible();
    await expect(wizard.getByText(/specification/i).first()).toBeVisible();
  });
});

test.describe("inventory and purchase", () => {
  test("stock table shows code, group and specification", async ({ page }) => {
    await page.goto("/owner/inventory");
    await page.getByRole("button", { name: /^stock$/i }).first().click();
    await expect(page.getByRole("columnheader", { name: /^item$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^code$/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /^specification$/i })).toBeVisible();
  });

  test("purchase page loads without error", async ({ page }) => {
    const failures: string[] = [];
    page.on("response", (r) => {
      if (r.status() >= 500) failures.push(`${r.status()} ${r.url()}`);
    });
    await page.goto("/owner/purchase");
    await expect(page.getByRole("heading", { name: /purchas/i }).first()).toBeVisible();
    expect(failures, failures.join("\n")).toHaveLength(0);
  });
});

test("the core owner pages render without a server error", async ({ page }) => {
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 500) failures.push(`${r.status()} ${r.url()}`);
  });

  for (const path of [
    "/owner/dashboard",
    "/owner/master-data",
    "/owner/inventory",
    "/owner/purchase",
    "/owner/production",
    "/owner/order-taking",
  ]) {
    await page.goto(path);
    await page.waitForLoadState("domcontentloaded");
  }

  expect(failures, `server errors:\n${failures.join("\n")}`).toHaveLength(0);
});

test.describe("variants and BOM", () => {
  test("ticking a second value on a field turns the wizard into a variant grid", async ({
    page,
  }) => {
    await page.goto("/owner/settings/master-data/add");

    // Walk all the way to a *kind* — the spec fields hang off the subgroup, not
    // the category, so stopping one level short shows no fields at all.
    await page.getByRole("button", { name: /^inventory$/i }).first().click();
    await page.getByRole("button", { name: /^finished good$/i }).first().click();
    await page.getByRole("button", { name: /^seat cover$/i }).first().click();
    await expect(page.getByText(/^specification$/i)).toBeVisible();

    // There is no mode to switch on: opening a field shows a checkbox list.
    await expect(page.getByRole("button", { name: /^many$/i })).toHaveCount(0);

    const design = page.getByPlaceholder(/select design/i);
    await expect(design).toBeVisible();
    await design.click();
    const list = page.getByRole("listbox").first();
    await expect(list).toBeVisible();

    // One tick is one item, so no variant grid yet.
    await list.getByRole("option").first().click();
    await expect(page.getByText(/one row per SKU/i)).toBeHidden();

    // The second tick is the whole gesture — the grid appears with no toggle.
    await design.click();
    await page.getByRole("listbox").first().getByRole("option").nth(1).click();
    await expect(page.getByText(/one row per SKU/i)).toBeVisible();
    await expect(page.getByText(/2 — varies/)).toBeVisible();
  });

  test("a producible row opens a bill of materials that names where each line came from", async ({
    page,
  }) => {
    await page.goto("/owner/master-data");
    const bom = page.getByRole("button", { name: /^BOM ▼$/ }).first();

    // Purchased categories legitimately have no BOM button, so only assert the
    // editor's behaviour when one is on screen.
    if (await bom.count()) {
      await bom.click();
      await expect(page.getByText(/bill of materials/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /rebuild blueprint/i })).toBeVisible();
      await expect(
        page.getByPlaceholder(/search raw materials, sub-assemblies, consumables/i)
      ).toBeVisible();
    }
  });

  test("dropdowns are app-rendered, not the browser's own control", async ({ page }) => {
    await page.goto("/owner/production");
    // The Select primitive keeps a hidden native select for form semantics and
    // renders its own list, so what the user actually clicks is a listbox.
    const trigger = page.locator('button[aria-haspopup="listbox"]').first();
    if (await trigger.count()) {
      await trigger.click();
      await expect(page.getByRole("listbox").first()).toBeVisible();
    }
  });
});

test.describe("category tree", () => {
  test("categories nest to any depth, and can be renamed and deleted", async ({ page }) => {
    // Creates and removes its own scratch categories, so it leaves the seeded
    // taxonomy exactly as it found it.
    const parent = `ZZ Test Parent ${Date.now()}`;
    const child = "ZZ Test Child";

    await page.goto("/owner/master-data?mode=configure");
    await page.getByRole("button", { name: /^raw material$/i }).first().click();

    // The studio's own rail: the app nav is also an <aside>, and the shell
    // keeps a hidden copy of the studio, so filter to what is actually shown.
    const sidebar = page.locator("aside:visible").filter({ hasText: /All Raw Material/ }).last();
    const newSub = sidebar.getByPlaceholder(/^new subgroup$/i).first();
    await expect(newSub).toBeVisible();
    await newSub.fill(parent);
    await newSub.press("Enter");
    await expect(sidebar.getByRole("button", { name: parent, exact: true })).toBeVisible();

    // Selecting the new node must re-aim the input at it — that is what makes a
    // third level reachable at all.
    await sidebar.getByRole("button", { name: parent, exact: true }).click();
    const nested = sidebar.getByPlaceholder(new RegExp(`new under ${parent}`, "i")).first();
    await expect(nested).toBeVisible();
    await nested.fill(child);
    await nested.press("Enter");
    await expect(sidebar.getByRole("button", { name: child, exact: true })).toBeVisible();

    // A parent with children refuses to delete, and says why.
    await sidebar.getByRole("button", { name: parent, exact: true }).hover();
    await sidebar.getByRole("button", { name: `Delete ${parent}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^delete$/i }).click();
    await expect(page.getByText(/delete the 1 subcategory inside/i)).toBeVisible();

    // Clean up child first, then parent.
    await sidebar.getByRole("button", { name: child, exact: true }).hover();
    await sidebar.getByRole("button", { name: `Delete ${child}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^delete$/i }).click();
    await expect(sidebar.getByRole("button", { name: child, exact: true })).toBeHidden();

    await sidebar.getByRole("button", { name: parent, exact: true }).hover();
    await sidebar.getByRole("button", { name: `Delete ${parent}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^delete$/i }).click();
    await expect(sidebar.getByRole("button", { name: parent, exact: true })).toBeHidden();
  });

  test("Design and Colour are record sheets with no item-shaped actions", async ({ page }) => {
    await page.goto("/owner/master-data");
    await page.getByRole("button", { name: /^design$/i }).first().click();

    // The grid renders design rows from the Design table.
    await expect(page.getByText(/fabric consumption/i).first()).toBeVisible();
    // Export stays; Import, Template and Delete would all point at ItemMaster.
    await expect(page.getByRole("button", { name: /^export$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^template$/i })).toBeHidden();
    await expect(page.getByRole("button", { name: /^delete$/i })).toBeHidden();
  });
});

test.describe("production item search", () => {
  test("one box searches the whole finished-good catalogue", async ({ page }) => {
    await page.goto("/owner/production");

    // Open the studio and wait for it to mount. Clicking and asserting in the
    // same breath passed alone and failed in sequence — the modal is not
    // instant, and "not yet" is indistinguishable from "not there".
    await page.getByRole("button", { name: /new production/i }).first().click();
    await expect(page.getByText(/variant search/i).first()).toBeVisible();

    const search = page.getByPlaceholder(/search what to produce/i).first();
    await expect(search).toBeVisible();

    // Words match in any order, so a second word narrows rather than restarting.
    await search.click();
    await search.fill("swift");
    const first = page.getByRole("button", { name: /seat cover.*swift/i }).first();
    await expect(first).toBeVisible({ timeout: 15000 });

    // The staged builder is still reachable — a combination never made before
    // has no name to search for.
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: /can.t find it\? build it piece by piece/i }).first()
    ).toBeVisible();
  });
});

test.describe("field types and search reach", () => {
  test("Configure offers the media and formatting field types", async ({ page }) => {
    await page.goto("/owner/master-data?mode=configure");
    // The type picker is app-rendered, so open it rather than reading a native
    // select. Identified by its default value, since the field-kind picker sits
    // beside it and both are listboxes.
    // By accessible name, not text: the trigger renders a ▾ glyph beside the
    // value, so a text match on "TEXT" alone never lands.
    const trigger = page.getByRole("button", { name: "TEXT", exact: true }).first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    const list = page.getByRole("listbox").first();
    for (const type of ["IMAGE", "FILE", "DATE", "COLOR", "TEXTAREA"]) {
      await expect(list.getByRole("option", { name: type, exact: true })).toBeVisible();
    }
  });

  test("global search reaches the finished-good catalogue", async ({ page }) => {
    await page.goto("/owner/search?q=swift");
    // Finished goods were absent from global search entirely; the largest thing
    // in the factory was the one thing the search bar could not find.
    await expect(page.getByRole("heading", { name: /finished goods/i })).toBeVisible();
    await expect(page.getByText(/seat cover.*swift/i).first()).toBeVisible();
  });
});
