import prisma from "@/lib/prisma";
import { deriveItemType } from "@/lib/item-constants";

/**
 * Items belonging to a named category, for the screens that still ask for one
 * specific kind of thing.
 *
 * Colours used to live in their own table, so `prisma.color.findMany` was how
 * you got the list. Then they became items in a spec-engine `ItemGroup` tree.
 * That tree went with the MES layer, so the category is now `MaterialCategory`,
 * which is the only grouping a `Product` still carries.
 *
 * Matching by name is the weak part, and it is deliberate rather than
 * overlooked: the owner can rename the category. The real fix is for the order
 * to carry a chosen colour rather than a hardcoded colour column, which is its
 * own piece of work.
 */
export async function itemsInRootCategory(
  factoryId: string,
  categoryName: string
): Promise<{ id: string; name: string }[]> {
  const category = await prisma.materialCategory.findFirst({
    where: { factoryId, name: { equals: categoryName, mode: "insensitive" } },
    select: { id: true },
  });
  if (!category) return [];

  return prisma.product.findMany({
    where: { factoryId, categoryId: category.id, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * SKUs are unique across every factory, so two colours both called "Beige"
 * would collide. Suffix until free rather than failing the insert.
 */
async function uniqueSku(name: string): Promise<string> {
  const base =
    name.trim().replace(/[^A-Za-z0-9]+/g, "-").toUpperCase() ||
    `ITEM-${Date.now().toString(36).toUpperCase()}`;
  let candidate = base;
  for (let i = 2; ; i++) {
    const clash = await prisma.product.findUnique({
      where: { sku: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${i}`;
  }
}

/**
 * Create an item in a named category, for inline "add a colour" flows.
 *
 * Returns null when the category does not exist, so the caller can say so
 * rather than writing an orphan.
 */
export async function createItemInRootCategory(
  factoryId: string,
  categoryName: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  const category = await prisma.materialCategory.findFirst({
    where: { factoryId, name: { equals: categoryName, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!category) return null;

  return prisma.product.create({
    data: {
      factoryId,
      categoryId: category.id,
      name: name.trim(),
      sku: await uniqueSku(name),
      // The category used to carry an explicit itemType; MaterialCategory does
      // not, so it is derived from the name the same way item creation does it.
      itemType: deriveItemType(category.name),
      // Required, and meaningless for a colour or a design — they are never
      // counted. "PCS" is the neutral choice the rest of the app already treats
      // as the default.
      defaultUOM: "PCS",
      status: "ACTIVE",
    },
    select: { id: true, name: true },
  });
}
