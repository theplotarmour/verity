"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import { MENU_BLOCKERS, type MenuBlocker } from "@/lib/menu";

/**
 * The menu: categories and the items in them.
 *
 * The first Restaurant OS module. Everything else in the vertical reads from
 * here — a table order is a list of menu items, a kitchen ticket is the same list
 * grouped by station — so this is the one place a price or an availability flag is
 * allowed to live.
 *
 * Every action derives `factoryId` from the session. Nothing here accepts a
 * tenant id, because every export in a `"use server"` module is a public POST
 * endpoint.
 *
 * Writes go through `guardModuleWrite("menu")`, which checks the entitlement *and*
 * the subscription's read-only state — a lapsed trial must not be able to reprice
 * a menu.
 */

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : T))
  | { error: string; blocker?: MenuBlocker };

export type CategoryInput = { name: string; sortOrder?: number };

export type MenuItemInput = {
  categoryId: string;
  name: string;
  description?: string | null;
  /** Paise. Integer. */
  price: number;
  isVeg?: boolean;
  available?: boolean;
  imageUrl?: string | null;
  notes?: string | null;
  sortOrder?: number;
};

/** Trim to null, so an empty form field is absent rather than an empty string. */
const clean = (value: string | null | undefined) => value?.trim() || null;

/**
 * The whole menu, ordered as it would be printed.
 *
 * Categories by `sortOrder` then name, items likewise within each — a menu whose
 * order changes between renders is unusable for someone reading it aloud down a
 * phone. Includes unavailable items: the manager's screen needs to see what is off
 * in order to switch it back on.
 */
export async function listMenu() {
  const user = await getOwnerUser();
  if (!user) return [];
  await guardModuleAction("menu");

  return prisma.menuCategory.findMany({
    where: { factoryId: user.factoryId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          isVeg: true,
          available: true,
          imageUrl: true,
          notes: true,
          sortOrder: true,
        },
      },
    },
  });
}

export async function createCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("menu");

  const name = input.name?.trim();
  if (!name) return { error: "A category needs a name" };

  const existing = await prisma.menuCategory.findFirst({
    where: { factoryId: user.factoryId, name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  // Checked rather than left to the unique index: a duplicate is a typo, and the
  // manager should read "Starters already exists", not a constraint name.
  if (existing) return { error: `"${name}" already exists` };

  const category = await prisma.menuCategory.create({
    data: { factoryId: user.factoryId, name, sortOrder: input.sortOrder ?? 0 },
    select: { id: true },
  });

  revalidatePath("/owner/menu");
  return { success: true, id: category.id };
}

export async function updateCategory(
  categoryId: string,
  input: CategoryInput
): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("menu");

  const name = input.name?.trim();
  if (!name) return { error: "A category needs a name" };

  const clash = await prisma.menuCategory.findFirst({
    where: {
      factoryId: user.factoryId,
      name: { equals: name, mode: "insensitive" },
      id: { not: categoryId },
    },
    select: { id: true },
  });
  if (clash) return { error: `"${name}" already exists` };

  // updateMany with the factory in the filter: `update` by id would throw on
  // another tenant's row, and the throw itself confirms the row exists.
  const { count } = await prisma.menuCategory.updateMany({
    where: { id: categoryId, factoryId: user.factoryId },
    data: { name, ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }) },
  });
  if (count === 0) return { error: "Category not found" };

  revalidatePath("/owner/menu");
  return { success: true };
}

/**
 * Delete a category, refusing while it still holds items.
 *
 * `MenuItem.category` has no `onDelete`, so Postgres already refuses — but as a
 * foreign-key violation naming a constraint, which is not something to show a
 * restaurant manager. This checks first and says how many items are in the way, so
 * the fix ("move or delete these six") is obvious.
 */
export async function deleteCategory(categoryId: string): Promise<ActionResult<{ items?: number }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("menu");

  const category = await prisma.menuCategory.findFirst({
    where: { id: categoryId, factoryId: user.factoryId },
    select: { id: true, name: true, _count: { select: { items: true } } },
  });
  if (!category) return { error: "Category not found" };

  if (category._count.items > 0) {
    return {
      error:
        `"${category.name}" still has ${category._count.items} ` +
        `${category._count.items === 1 ? "item" : "items"}. ` +
        "Move or delete them first.",
      blocker: MENU_BLOCKERS.CATEGORY_HAS_ITEMS,
      items: category._count.items,
    };
  }

  await prisma.menuCategory.delete({ where: { id: category.id } });

  revalidatePath("/owner/menu");
  return { success: true };
}

export async function createItem(input: MenuItemInput): Promise<ActionResult<{ id: string }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("menu");

  const name = input.name?.trim();
  if (!name) return { error: "An item needs a name" };

  const priceError = validatePrice(input.price);
  if (priceError) return { error: priceError };

  // The category must belong to this tenant, or an item lands in someone else's
  // menu — the categoryId arrives from the client.
  const category = await prisma.menuCategory.findFirst({
    where: { id: input.categoryId, factoryId: user.factoryId },
    select: { id: true },
  });
  if (!category) return { error: "Category not found" };

  const item = await prisma.menuItem.create({
    data: {
      factoryId: user.factoryId,
      categoryId: category.id,
      name,
      description: clean(input.description),
      price: Math.round(input.price),
      isVeg: input.isVeg ?? true,
      available: input.available ?? true,
      imageUrl: clean(input.imageUrl),
      notes: clean(input.notes),
      sortOrder: input.sortOrder ?? 0,
    },
    select: { id: true },
  });

  revalidatePath("/owner/menu");
  return { success: true, id: item.id };
}

/**
 * Update an item.
 *
 * Takes the whole input, not a patch: every optional field is written as
 * `clean(x)`, so a partial payload would blank the description and the photo. The
 * same trap the item-detail form hit in master data.
 */
export async function updateItem(itemId: string, input: MenuItemInput): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("menu");

  const name = input.name?.trim();
  if (!name) return { error: "An item needs a name" };

  const priceError = validatePrice(input.price);
  if (priceError) return { error: priceError };

  const category = await prisma.menuCategory.findFirst({
    where: { id: input.categoryId, factoryId: user.factoryId },
    select: { id: true },
  });
  if (!category) return { error: "Category not found" };

  const { count } = await prisma.menuItem.updateMany({
    where: { id: itemId, factoryId: user.factoryId },
    data: {
      categoryId: category.id,
      name,
      description: clean(input.description),
      price: Math.round(input.price),
      isVeg: input.isVeg ?? true,
      available: input.available ?? true,
      imageUrl: clean(input.imageUrl),
      notes: clean(input.notes),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    },
  });
  if (count === 0) return { error: "Item not found" };

  revalidatePath("/owner/menu");
  return { success: true };
}

export async function deleteItem(itemId: string): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("menu");

  const { count } = await prisma.menuItem.deleteMany({
    where: { id: itemId, factoryId: user.factoryId },
  });
  if (count === 0) return { error: "Item not found" };

  revalidatePath("/owner/menu");
  return { success: true };
}

/**
 * Turn one item on or off.
 *
 * The fast path, and the reason it is its own action rather than a call to
 * `updateItem`: this fires mid-service, from a phone, when the kitchen shouts that
 * the fish is gone. It writes exactly one column, so it cannot blank a description
 * or reprice anything on the way past, and it needs no form state — which also
 * means it cannot clobber an edit somebody else has open.
 */
export async function toggleAvailability(
  itemId: string,
  available: boolean
): Promise<ActionResult<{ available: boolean }>> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("menu");

  const { count } = await prisma.menuItem.updateMany({
    where: { id: itemId, factoryId: user.factoryId },
    data: { available },
  });
  if (count === 0) return { error: "Item not found" };

  revalidatePath("/owner/menu");
  return { success: true, available };
}

/**
 * Prices are integer paise.
 *
 * ₹0 is allowed — a complimentary item, or a modifier that carries no charge — but
 * a negative or fractional price is not. A float here becomes a bill that does not
 * add up, and nobody wins that support call.
 */
function validatePrice(price: number): string | null {
  if (typeof price !== "number" || !Number.isFinite(price)) return "Price must be a number";
  if (price < 0) return "Price cannot be negative";
  if (!Number.isInteger(price)) return "Price must be whole paise, not a fraction";
  return null;
}
