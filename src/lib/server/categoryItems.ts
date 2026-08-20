import prisma from "@/lib/prisma";

/**
 * Items belonging to a named root category, for the screens that still ask for
 * one specific kind of thing.
 *
 * Colours used to live in their own table, so `prisma.color.findMany` was how
 * you got the list. They are ordinary items in an ordinary category now, and
 * this is the replacement.
 *
 * Matching by name is the weak part, and it is deliberate rather than
 * overlooked: the owner can rename the category. The alternative is a marker
 * column on ItemGroup, which is what "record sheet" was — the thing being
 * removed. The existing fabric picker already matches on `group: { name:
 * "Fabric" }` for the same reason, so this at least fails the same way
 * everywhere. The real fix is for the order to carry a spec field rather than a
 * hardcoded colour column, which is its own piece of work.
 */
export async function itemsInRootCategory(
  factoryId: string,
  categoryName: string
): Promise<{ id: string; name: string }[]> {
  const root = await prisma.itemGroup.findFirst({
    where: {
      factoryId,
      parentId: null,
      name: { equals: categoryName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (!root) return [];

  // Descendants too: a colour filed under "Colour › Metallic" is still a colour.
  const groups = await prisma.itemGroup.findMany({
    where: { factoryId },
    select: { id: true, parentId: true },
  });
  const ids = new Set([root.id]);
  let changed = true;
  let guard = groups.length + 1;
  while (changed && guard-- > 0) {
    changed = false;
    for (const g of groups) {
      if (g.parentId && ids.has(g.parentId) && !ids.has(g.id)) {
        ids.add(g.id);
        changed = true;
      }
    }
  }

  return prisma.product.findMany({
    where: { factoryId, groupId: { in: [...ids] }, status: "ACTIVE" },
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
 * Create an item in a named root category, for inline "add a colour" flows.
 *
 * Returns null when the category does not exist, so the caller can say so
 * rather than writing an orphan.
 */
export async function createItemInRootCategory(
  factoryId: string,
  categoryName: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  const root = await prisma.itemGroup.findFirst({
    where: {
      factoryId,
      parentId: null,
      name: { equals: categoryName, mode: "insensitive" },
    },
    select: { id: true, itemType: true },
  });
  if (!root) return null;

  return prisma.product.create({
    data: {
      factoryId,
      groupId: root.id,
      name: name.trim(),
      sku: await uniqueSku(name),
      itemType: root.itemType,
      // Required, and meaningless for a colour or a design — they are never
      // counted. "PCS" is the neutral choice the rest of the app already treats
      // as the default.
      defaultUOM: "PCS",
      status: "ACTIVE",
    },
    select: { id: true, name: true },
  });
}
