"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";
import { resolveAccess } from "@/platform/rbac/permissions";

/**
 * The customer catalogue.
 *
 * Deliberately narrow. `items.ts` owns whether a Product exists, what unit it is
 * stocked in and which category it files under; this owns the four columns a
 * customer sees — price, picture, description, and whether it is published at
 * all. Two screens over one row rather than two write paths over one table.
 *
 * Nothing here creates or deletes a Product. An item a tenant does not sell is
 * an inventory decision, and an item they sell but do not want on the portal
 * today is `isPublished: false`, which is what this screen is for.
 */

export type CatalogRow = {
  id: string;
  name: string;
  sku: string;
  itemCode: string | null;
  itemType: string;
  description: string | null;
  imageUrl: string | null;
  pricePaise: number;
  isPublished: boolean;
  categoryName: string | null;
};

type ActionResult = { success: true } | { error: string };

/**
 * What a tenant could put in front of a customer.
 *
 * Scoped to the two types a portal can render: a service is bookable and a
 * finished product is orderable. Raw materials, packaging and spares are stock,
 * and listing them here would invite someone to publish a bolt of lining fabric
 * to their storefront.
 */
export async function getCatalog(): Promise<CatalogRow[]> {
  const user = await getOwnerUser();
  if (!user) return [];
  await guardModuleAction("catalog");

  const rows = await prisma.product.findMany({
    where: {
      factoryId: user.factoryId,
      status: "ACTIVE",
      itemType: { in: ["SERVICE", "FINISHED_PRODUCT"] },
    },
    select: {
      id: true,
      name: true,
      sku: true,
      itemCode: true,
      itemType: true,
      description: true,
      imageUrl: true,
      pricePaise: true,
      isPublished: true,
      category: { select: { name: true } },
    },
    orderBy: [{ isPublished: "desc" }, { name: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sku: r.sku,
    itemCode: r.itemCode,
    itemType: r.itemType,
    description: r.description,
    imageUrl: r.imageUrl,
    pricePaise: r.pricePaise,
    isPublished: r.isPublished,
    categoryName: r.category?.name ?? null,
  }));
}

export type CatalogUpdate = {
  id: string;
  pricePaise: number;
  description?: string | null;
  imageUrl?: string | null;
  isPublished: boolean;
};

/** Set the customer-facing fields on one item. */
export async function updateCatalogItem(input: CatalogUpdate): Promise<ActionResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("catalog");

  const access = await resolveAccess(user.id);
  if (!access?.permissions.has("catalog.manage")) {
    return { error: "You do not have permission to manage the catalogue." };
  }

  const pricePaise = Math.max(0, Math.round(input.pricePaise || 0));
  if (!Number.isFinite(pricePaise)) return { error: "Enter a valid price." };
  /*
   * A published item with no price would render as "free" on the portal, which
   * is a pricing decision nobody made. Refused rather than defaulted.
   */
  if (input.isPublished && pricePaise <= 0) {
    return { error: "Set a price before publishing this item to your portal." };
  }

  // Scoped update: factoryId in the where clause, so a tampered id from another
  // tenant matches nothing rather than repricing a stranger's menu.
  const result = await prisma.product.updateMany({
    where: { id: input.id, factoryId: user.factoryId },
    data: {
      pricePaise,
      isPublished: input.isPublished,
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
    },
  });
  if (result.count === 0) return { error: "Item not found." };

  revalidatePath("/owner/catalog");
  return { success: true };
}
