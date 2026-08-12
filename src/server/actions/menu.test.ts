import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import prisma from "@/lib/prisma";
import { MENU_BLOCKERS, formatMenuPrice } from "@/lib/menu";

/**
 * The menu module.
 *
 * Two behaviours are worth pinning against the real schema. A category delete must
 * refuse while items point at it — Postgres already refuses, since
 * `MenuItem.category` has no `onDelete` and so defaults to Restrict, but as a
 * foreign-key error naming a constraint, which is not something to show a
 * restaurant manager mid-service. And `toggleAvailability` must touch exactly one
 * row: it is the fast path when the kitchen shouts that the fish is gone, fired
 * from a phone, and a toggle that took its neighbours with it would empty a menu
 * section during service.
 *
 * The actions call `getOwnerUser()` and need a request context, so what runs here
 * is the queries and the constraints they rely on.
 */
describe("menu", () => {
  let factoryId: string;
  let seeded = false;
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const cleanup = { categories: [] as string[] };

  beforeAll(async () => {
    const factory = await prisma.factory.findFirst({ where: { slug: "carxen" } });
    if (!factory) return;
    factoryId = factory.id;
    seeded = true;
  });

  afterAll(async () => {
    for (const id of cleanup.categories) {
      await prisma.menuItem.deleteMany({ where: { categoryId: id } });
      await prisma.menuCategory.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  async function makeCategory(name: string) {
    const category = await prisma.menuCategory.create({
      data: { factoryId, name: `${name} ${suffix}`, sortOrder: 0 },
      select: { id: true },
    });
    cleanup.categories.push(category.id);
    return category.id;
  }

  async function makeItem(categoryId: string, name: string, price = 249_00) {
    const item = await prisma.menuItem.create({
      data: { factoryId, categoryId, name: `${name} ${suffix}`, price },
      select: { id: true, available: true },
    });
    return item.id;
  }

  /** The blocker check `deleteCategory` runs before it deletes anything. */
  async function blockerFor(categoryId: string) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: categoryId, factoryId },
      select: { name: true, _count: { select: { items: true } } },
    });
    if (!category) return { blocker: null as string | null, items: 0 };
    return category._count.items > 0
      ? { blocker: MENU_BLOCKERS.CATEGORY_HAS_ITEMS, items: category._count.items }
      : { blocker: null, items: 0 };
  }

  it("refuses to delete a category that still holds items, by name", async () => {
    if (!seeded) return;
    const categoryId = await makeCategory("Starters");
    await makeItem(categoryId, "Paneer Tikka");
    await makeItem(categoryId, "Samosa");

    const result = await blockerFor(categoryId);
    expect(result.blocker).toBe(MENU_BLOCKERS.CATEGORY_HAS_ITEMS);
    expect(result.items).toBe(2);

    // And the database is the backstop behind the named check, not a substitute
    // for it: the guard exists so nobody ever has to read this error.
    await expect(prisma.menuCategory.delete({ where: { id: categoryId } })).rejects.toThrow();
  });

  it("allows the delete once the items are gone", async () => {
    if (!seeded) return;
    const categoryId = await makeCategory("Empty soon");
    const itemId = await makeItem(categoryId, "Temporary");

    expect((await blockerFor(categoryId)).blocker).toBe(MENU_BLOCKERS.CATEGORY_HAS_ITEMS);

    await prisma.menuItem.delete({ where: { id: itemId } });
    expect((await blockerFor(categoryId)).blocker).toBeNull();

    await prisma.menuCategory.delete({ where: { id: categoryId } });
    expect(await prisma.menuCategory.count({ where: { id: categoryId } })).toBe(0);
  });

  it("toggles one item without touching its neighbours", async () => {
    if (!seeded) return;
    const categoryId = await makeCategory("Mains");
    const fish = await makeItem(categoryId, "Fish Curry", 420_00);
    const dal = await makeItem(categoryId, "Dal Tadka", 220_00);
    const rice = await makeItem(categoryId, "Jeera Rice", 180_00);

    // The update the action performs.
    const { count } = await prisma.menuItem.updateMany({
      where: { id: fish, factoryId },
      data: { available: false },
    });
    expect(count).toBe(1);

    const rows = await prisma.menuItem.findMany({
      where: { categoryId },
      select: { id: true, available: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r.available]));
    expect(byId.get(fish)).toBe(false);
    expect(byId.get(dal), "a sibling was switched off").toBe(true);
    expect(byId.get(rice), "a sibling was switched off").toBe(true);
  });

  it("changes nothing but availability", async () => {
    if (!seeded) return;
    // The reason this is its own action rather than a call to updateItem, which
    // writes every field and would blank a description sent as a partial payload.
    const categoryId = await makeCategory("Breads");
    const naan = await prisma.menuItem.create({
      data: {
        factoryId,
        categoryId,
        name: `Butter Naan ${suffix}`,
        price: 80_00,
        description: "Tandoor, brushed with butter",
        imageUrl: "https://example.test/naan.jpg",
        isVeg: true,
        sortOrder: 3,
      },
      select: { id: true },
    });

    await prisma.menuItem.updateMany({
      where: { id: naan.id, factoryId },
      data: { available: false },
    });

    const after = await prisma.menuItem.findUniqueOrThrow({
      where: { id: naan.id },
      select: {
        available: true,
        description: true,
        price: true,
        imageUrl: true,
        isVeg: true,
        sortOrder: true,
      },
    });
    expect(after).toEqual({
      available: false,
      description: "Tandoor, brushed with butter",
      price: 80_00,
      imageUrl: "https://example.test/naan.jpg",
      isVeg: true,
      sortOrder: 3,
    });
  });

  it("will not toggle another tenant's item", async () => {
    if (!seeded) return;
    const categoryId = await makeCategory("Tenant");
    const itemId = await makeItem(categoryId, "Scoped");

    const { count } = await prisma.menuItem.updateMany({
      where: { id: itemId, factoryId: "some-other-factory" },
      data: { available: false },
    });
    expect(count).toBe(0);

    const row = await prisma.menuItem.findUniqueOrThrow({
      where: { id: itemId },
      select: { available: true },
    });
    expect(row.available).toBe(true);
  });

  it("refuses two categories with the same name", async () => {
    if (!seeded) return;
    // Not a use case: the second one prints blank on the card and splits the
    // reporting. The unique index is the backstop; the action checks first so the
    // manager reads "Starters already exists".
    const name = `Duplicate ${suffix}`;
    const first = await prisma.menuCategory.create({
      data: { factoryId, name },
      select: { id: true },
    });
    cleanup.categories.push(first.id);

    await expect(prisma.menuCategory.create({ data: { factoryId, name } })).rejects.toThrow();
  });

  it("stores price as integer paise", async () => {
    if (!seeded) return;
    const categoryId = await makeCategory("Pricing");
    const itemId = await makeItem(categoryId, "Exact", 249_50);

    const row = await prisma.menuItem.findUniqueOrThrow({
      where: { id: itemId },
      select: { price: true },
    });
    expect(row.price).toBe(24950);
    expect(Number.isInteger(row.price)).toBe(true);
  });
});

describe("formatMenuPrice", () => {
  it("drops the paise when there are none", () => {
    expect(formatMenuPrice(249_00)).toBe("₹249");
  });

  it("keeps both digits when there are paise", () => {
    // Two decimals or none. "₹249.5" is not a price anybody writes on a menu.
    expect(formatMenuPrice(249_50)).toBe("₹249.50");
    expect(formatMenuPrice(249_05)).toBe("₹249.05");
  });

  it("renders free as ₹0 rather than blank", () => {
    // A complimentary item is a real menu row.
    expect(formatMenuPrice(0)).toBe("₹0");
  });
});

describe("menu actions", () => {
  const source = readFileSync(path.resolve(__dirname, "menu.ts"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

  it("scopes every write by the session's factory", () => {
    // Not one query in this file may filter on an id alone.
    const filters = code.match(/where: \{ id: \w+/g) ?? [];
    expect(filters.length).toBeGreaterThan(0);
    for (const filter of filters) {
      expect(
        code.slice(code.indexOf(filter), code.indexOf(filter) + 90),
        `${filter} is not scoped by factory`,
      ).toMatch(/factoryId/);
    }
  });

  it("takes no factoryId as an argument", () => {
    // "use server": every export is a public POST endpoint.
    expect(code).not.toMatch(/function \w+\([^)]*factoryId/);
    expect(code).toMatch(/getOwnerUser\(\)/);
  });

  it("guards writes on the module and the subscription", () => {
    const writes = ["createCategory", "updateCategory", "deleteCategory", "createItem", "updateItem", "deleteItem", "toggleAvailability"];
    for (const fn of writes) {
      const body = code.slice(code.indexOf(`export async function ${fn}`));
      const end = body.indexOf("\n}");
      expect(
        body.slice(0, end),
        `${fn} does not call guardModuleWrite("menu")`,
      ).toMatch(/guardModuleWrite\("menu"\)/);
    }
  });

  it("returns a named blocker, not a matched message", () => {
    expect(code).toMatch(/blocker: MENU_BLOCKERS\.CATEGORY_HAS_ITEMS/);
  });

  it("validates that a price is whole paise", () => {
    expect(code).toMatch(/Number\.isInteger\(price\)/);
    expect(code).toMatch(/price < 0/);
  });

  it("verifies a category belongs to the tenant before putting an item in it", () => {
    // categoryId arrives from the client; without this an item lands in another
    // restaurant's menu.
    for (const fn of ["createItem", "updateItem"]) {
      const body = code.slice(code.indexOf(`export async function ${fn}`));
      expect(body.slice(0, body.indexOf("\n}"))).toMatch(
        /menuCategory\.findFirst\(\{\s*where: \{ id: input\.categoryId, factoryId: user\.factoryId \}/,
      );
    }
  });

  it("keeps toggleAvailability to a single column", () => {
    const body = code.slice(code.indexOf("export async function toggleAvailability"));
    const update = body.slice(body.indexOf("updateMany"), body.indexOf("\n}"));
    expect(update).toMatch(/data: \{ available \}/);
    // Nothing else. A second field here is how the fast path grows into updateItem.
    expect(update).not.toMatch(/name|price|description|imageUrl/);
  });
});
