"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { loadRefLabels } from "@/server/queries/spec";

/**
 * What counts as a makeable product.
 *
 * The category's own flag is authoritative: anything the owner marked producible
 * in the Master Data Studio shows up in production, whatever it is called and
 * whatever type its root carries. The itemType clause stays as a fallback so
 * items created before the flag existed, or filed straight under a finished-goods
 * root, are still found.
 */
const PRODUCIBLE_WHERE = {
  OR: [{ group: { isProducible: true } }, { itemType: "FINISHED_PRODUCT" as const }],
};

/**
 * One finished good, plus the descriptor fields the production studio reads.
 *
 * The descriptor is derived from the item's own spec answers rather than stored
 * beside them, so an item renamed or re-specced in the studio cannot drift from
 * what production shows.
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
    include: {
      group: { select: { name: true } },
      specValues: {
        include: {
          field: { select: { key: true, name: true, refTarget: true, unitSuffix: true, sortOrder: true } },
          option: { select: { label: true, shortCode: true } },
          valueItem: { select: { name: true, aliasName: true } },
        },
      },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  const refIds = items.flatMap((i) =>
    i.specValues.map((v) => v.valueRefId).filter((x): x is string => Boolean(x))
  );
  const refLabels = await loadRefLabels(refIds);

  return items.map((item) => {
    const by = new Map(item.specValues.map((v) => [v.field.key, v]));
    const refLabel = (key: string) => {
      const id = by.get(key)?.valueRefId;
      return id ? refLabels.get(id) ?? "" : "";
    };

    const back = by.get("backType");
    // Short codes are what the descriptor speaks: "DB", not "Double Back".
    const seatType = (back?.option?.shortCode ?? "") as "SB" | "DB" | "";
    const fabric = by.get("fabric")?.valueItem;

    // Resolve any spec answer to the text a person reads, regardless of how it
    // was stored (option pick, linked item, attribute reference, number, flag,
    // free text). Used to build the product-agnostic detail list.
    const answerText = (v: (typeof item.specValues)[number]): string => {
      if (v.option?.label) return v.option.label;
      if (v.valueItem) return v.valueItem.aliasName || v.valueItem.name || "";
      if (v.valueRefId) return refLabels.get(v.valueRefId) ?? "";
      if (v.valueBool !== null && v.valueBool !== undefined) return v.valueBool ? "Yes" : "No";
      if (v.valueNumber !== null && v.valueNumber !== undefined)
        return `${v.valueNumber}${v.field.unitSuffix ?? ""}`;
      return v.valueText ?? "";
    };

    const specDetails = [...item.specValues]
      .sort((a, b) => (a.field.sortOrder ?? 0) - (b.field.sortOrder ?? 0))
      .map((v) => ({ label: v.field.name, value: answerText(v) }))
      .filter((d) => d.value);

    return {
      id: item.id,
      name: item.name,
      itemCode: item.itemCode,
      brand: refLabel("brand"),
      model: refLabel("model"),
      generation: refLabel("generation"),
      product: item.group?.name ?? "",
      seatType: seatType === "SB" || seatType === "DB" ? seatType : "",
      headrests: by.get("headrests")?.valueNumber ?? null,
      armrest: (by.get("armrest")?.option?.label ?? "").toLowerCase() === "arm",
      fabricName: fabric?.aliasName || fabric?.name || "",
      designName: refLabel("design"),
      colorName: refLabel("colour") || refLabel("color"),
      imageUrl: item.imageUrl ?? null,
      specDetails,
    };
  });
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
 * Subgroups only: "Seat Cover" and "Floor Mats" are what a factory produces,
 * while their root "Finished Good" is a filing cabinet, not a thing to make.
 */
export async function listProductCategories() {
  const user = await getOwnerUser();
  const groups = await prisma.itemGroup.findMany({
    where: { factoryId: user.factoryId, isProducible: true, parentId: { not: null } },
    select: { id: true, name: true, parent: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return groups.map((g) => ({ id: g.id, name: g.name, parentName: g.parent?.name ?? null }));
}
