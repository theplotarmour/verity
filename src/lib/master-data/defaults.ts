import type { PrismaClient, ItemType } from "@prisma/client";

/**
 * The default shape of a brand-new factory's master data.
 *
 * Lives here rather than in prisma/seed.ts because a factory owner has to be
 * able to create it from the app — the studio's empty state used to tell them
 * to run `node scripts/seed_item_groups.mjs`, which is not something a person
 * on a factory floor can do. Both the seed script and that button now read
 * these same definitions, so they cannot drift apart.
 */

// A starting point, not a fixture. Every one of these can be renamed, deleted
// or added to, and a category the owner invents behaves identically — there is
// no longer any such thing as a special category.
// bomMode is stated for each, never left to the column default. It defaults to
// OFF, so a root seeded without one arrives with no BOM editor and no hint as
// to why — recoverable in Configure, but only by an owner who knows to look.
// Assembled things get a recipe; things other items pick get ingredients;
// things only bought and consumed get neither.
export const ROOT_GROUPS: {
  name: string;
  itemType: ItemType;
  shortCode: string;
  bomMode: "OFF" | "RECIPE" | "INGREDIENTS";
}[] = [
  { name: "Raw Material", itemType: "RAW_MATERIAL", shortCode: "RM", bomMode: "OFF" },
  { name: "Semi-Finished", itemType: "SEMI_FINISHED", shortCode: "SF", bomMode: "RECIPE" },
  { name: "Finished Good", itemType: "FINISHED_PRODUCT", shortCode: "FG", bomMode: "RECIPE" },
  { name: "Consumable", itemType: "CONSUMABLE", shortCode: "CN", bomMode: "OFF" },
  { name: "Packaging", itemType: "PACKAGING", shortCode: "PK", bomMode: "OFF" },
  { name: "Trading Goods", itemType: "SPARE_PART", shortCode: "TG", bomMode: "OFF" },
  // Colours are an ordinary category, not a record sheet: the table behind the
  // old sheet held nothing but a name, so there was never anything a dedicated
  // table bought. SERVICE because a colour is never counted, costed or shipped.
  { name: "Colour", itemType: "SERVICE", shortCode: "CLR", bomMode: "INGREDIENTS" },
  // Designs and colours are referenced by items rather than stocked, so they
  // are SERVICE. They used to be record sheets with their own tables; nothing
  // about them needed that.
  { name: "Design", itemType: "SERVICE", shortCode: "DSN", bomMode: "INGREDIENTS" },
];

// Find-then-create rather than upsert: Postgres unique indexes treat NULL as
// distinct, so the @@unique([factoryId, parentId, name]) constraint does not
// dedupe roots (whose parentId is null) and an upsert would create six fresh
// roots on every run.
export async function createDefaultMasterData(prisma: PrismaClient, factoryId: string) {
  for (const [i, g] of ROOT_GROUPS.entries()) {
    const existing = await prisma.itemGroup.findFirst({
      where: { factoryId, parentId: null, name: g.name },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.itemGroup.create({
      // Seeded roots are system categories: the backend keys production, stock
      // and order booking off their type, so they cannot be deleted or retyped.
      data: { ...g, factoryId, isSheet: true, isSystem: true, sortOrder: i },
    });
  }
}
