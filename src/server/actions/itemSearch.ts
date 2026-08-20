"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";

/**
 * What counts as a makeable product.
 *
 * This used to prefer the item category's own `isProducible` flag, set in the
 * Master Data Studio, and fall back to the item type. Categories went with the
 * spec engine, so the type is all that is left to ask.
 */
const PRODUCIBLE_WHERE = {
  itemType: "FINISHED_PRODUCT" as const,
};

/**
 * One finished good, plus the descriptor fields the production studio reads.
 *
 * The descriptor fields used to be derived from the item's spec answers. Those
 * answers went with the spec engine, so they are empty now. The shape is kept
 * because several clients destructure it, and narrowing it is a separate change
 * from removing what fed it.
 */
export type ItemSearchResult = {
  id: string;
  name: string;
  itemCode: string | null;
  brand: string;
  model: string;
  generation: string;
  product: string;
  seatType: "SB" | "DB" | "";
  headrests: number | null;
  armrest: boolean;
  fabricName: string;
  designName: string;
  colorName: string;
  /** The item's picture from Master Data, shown as a preview when set. */
  imageUrl: string | null;
  /**
   * Every answered spec column resolved to a label/value pair, in the group's
   * own column order. This is what makes the preview product-agnostic: it shows
   * whatever the item actually has instead of a fixed seat-cover row set.
   */
  specDetails: { label: string; value: string }[];
};

/**
 * Search every finished good by its composed name.
 *
 * The names already read "Seat Cover Maruti Swift 2005-2010 Double Back 5HDR
 * No Arm Premium SPC PRO SERIES Beige", so typing "swift beige" finds it —
 * which is the whole reason for replacing the staged brand → model →
 * generation → spec → fabric → design walk. Every word must match, in any
 * order, so a second word narrows rather than starting a new search.
 */
export async function searchFinishedGoods(query: string, limit = 40): Promise<ItemSearchResult[]> {
  const user = await getOwnerUser();
  const words = query.trim().split(/\s+/).filter(Boolean);

  const items = await prisma.product.findMany({
    where: {
      factoryId: user.factoryId,
      ...PRODUCIBLE_WHERE,
      status: { in: ["ACTIVE", "DRAFT"] },
      AND: words.map((w) => ({
        OR: [
          { name: { contains: w, mode: "insensitive" as const } },
          { itemCode: { contains: w, mode: "insensitive" as const } },
          { aliasName: { contains: w, mode: "insensitive" as const } },
        ],
      })),
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    itemCode: item.itemCode,
    brand: "",
    model: "",
    generation: "",
    product: "",
    seatType: "" as const,
    headrests: null,
    armrest: false,
    fabricName: "",
    designName: "",
    colorName: "",
    imageUrl: item.imageUrl ?? null,
    specDetails: [],
  }));
}

/** How many finished goods exist, so an empty search can say why it is empty. */
export async function countFinishedGoods() {
  const user = await getOwnerUser();
  return prisma.product.count({
    where: {
      factoryId: user.factoryId,
      ...PRODUCIBLE_WHERE,
      status: { in: ["ACTIVE", "DRAFT"] },
    },
  });
}

/**
 * Producible categories, for the structured form's Product group.
 *
 * These were the item groups an owner marked producible. Groups went with the
 * spec engine and have no successor, so this is empty - kept rather than
 * removed because the form reads it and guards on length.
 */
export async function listProductCategories() {
  return [] as { id: string; name: string; parentName: string | null }[];
}
