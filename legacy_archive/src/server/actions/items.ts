"use server";

import prisma from "@/lib/prisma";
import { deriveItemType } from "@/lib/item-constants";
import { getOwnerUser } from "@/lib/server/owner";
import { describeDeleteError } from "@/lib/server/prisma-errors";
import { revalidatePath } from "next/cache";
import { ItemType, Prisma } from "@prisma/client";
import { uploadStorageImage } from "@/server/actions/storage";
import { createStoragePath } from "@/lib/storage/paths";

// Upload an item image and return its public URL (path is built server-side so
// the client never needs the factory id or storage layout).
export async function uploadItemImage(dataUrl: string, fileName: string, mimeType: string, size: number) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  const up = await uploadStorageImage({
    path: createStoragePath({ factoryId: owner.factoryId, scope: "catalogue", id: "items", fileName }),
    dataUrl, fileName, mimeType: mimeType || "image/jpeg", size: size || 0,
  });
  return { url: up.publicUrl };
}

// Item Master is the single catalogue of everything the factory buys, makes,
// consumes or holds. The same row is referenced by Purchase, Inventory, BOM,
// Production and Dispatch — there is deliberately no per-module item list.

const ITEM_TYPE_PREFIX: Record<ItemType, string> = {
  RAW_MATERIAL: "RM",
  SEMI_FINISHED: "SF",
  FINISHED_PRODUCT: "FG",
  CONSUMABLE: "CN",
  PACKAGING: "PK",
  SPARE_PART: "SP",
  MACHINERY: "MC",
  TOOL: "TL",
  ASSET: "AS",
  SERVICE: "SV",
};

export type ItemInput = {
  id?: string;
  name: string;
  itemCode?: string; // blank => auto-generated
  sku?: string; // blank => defaults to itemCode
  itemType?: ItemType; // derived from category; kept optional for callers
  defaultUOM: string;
  secondaryUOM?: string;
  conversionFactor?: number | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  brand?: string;
  description?: string;
  imageUrl?: string;
  aliasName?: string;
  searchKeywords?: string[];
  status?: "ACTIVE" | "INACTIVE";
  minStockLevel?: number;
  hsnCode?: string;
  taxRate?: number;
  customFields?: Record<string, string>; // keyed by ItemFieldDefinition.id
};

// Next auto code for a type: <PREFIX>-00042. Scans existing codes with that
// prefix and takes max+1 so gaps from edits/deletes don't cause collisions.
async function nextItemCode(factoryId: string, itemType: ItemType): Promise<string> {
  const prefix = ITEM_TYPE_PREFIX[itemType];
  const existing = await prisma.product.findMany({
    where: { factoryId, itemCode: { startsWith: `${prefix}-` } },
    select: { itemCode: true },
  });
  let max = 0;
  for (const e of existing) {
    const n = parseInt((e.itemCode ?? "").split("-")[1] ?? "0", 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(5, "0")}`;
}

// Everything the Items create/edit drawer needs: the full item list plus the
// category tree used by the category / subcategory pickers.
export async function getItemFormData() {
  const user = await getOwnerUser();
  if (!user) return { items: [], categories: [], fieldDefs: [] };

  const [items, categories, fieldDefs] = await Promise.all([
    prisma.product.findMany({
      where: { factoryId: user.factoryId },
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        conversions: true,
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    prisma.materialCategory.findMany({
      where: { factoryId: user.factoryId },
      include: { subcategories: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.itemFieldDefinition.findMany({
      where: { factoryId: user.factoryId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return { items, categories, fieldDefs };
}

// Owner-defined custom item fields (apply to every item).
export async function addItemField(name: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  const clean = name.trim();
  if (!clean) return { error: "Enter a field name" };
  const dup = await prisma.itemFieldDefinition.findFirst({
    where: { factoryId: owner.factoryId, name: { equals: clean, mode: "insensitive" } },
    select: { id: true },
  });
  if (dup) return { error: `"${clean}" field already exists` };
  const count = await prisma.itemFieldDefinition.count({ where: { factoryId: owner.factoryId } });
  const def = await prisma.itemFieldDefinition.create({
    data: { factoryId: owner.factoryId, name: clean, sortOrder: count },
  });
  revalidatePath("/owner/inventory");
  return { success: true, def };
}

export async function renameItemField(id: string, name: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  if (!name.trim()) return { error: "Enter a field name" };
  await prisma.itemFieldDefinition.updateMany({
    where: { id, factoryId: owner.factoryId },
    data: { name: name.trim() },
  });
  revalidatePath("/owner/inventory");
  return { success: true };
}

export async function removeItemField(id: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  await prisma.itemFieldDefinition.deleteMany({ where: { id, factoryId: owner.factoryId } });
  revalidatePath("/owner/inventory");
  return { success: true };
}

// Item Type follows the Category (see deriveItemType). Look up the category
// name for the chosen categoryId and derive, so the two can never disagree.
async function resolveItemType(factoryId: string, categoryId?: string | null): Promise<ItemType> {
  if (!categoryId) return "RAW_MATERIAL";
  const cat = await prisma.materialCategory.findFirst({
    where: { id: categoryId, factoryId },
    select: { name: true },
  });
  return deriveItemType(cat?.name);
}

export async function createItem(input: ItemInput) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  if (!input.name?.trim()) return { error: "Name is required" };
  if (!input.defaultUOM?.trim()) return { error: "Primary unit is required" };

  const itemType = await resolveItemType(owner.factoryId, input.categoryId);
  const itemCode = input.itemCode?.trim() || (await nextItemCode(owner.factoryId, itemType));
  const sku = input.sku?.trim() || itemCode;

  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          factoryId: owner.factoryId,
          name: input.name.trim(),
          itemCode,
          sku,
          itemType,
          defaultUOM: input.defaultUOM.trim(),
          secondaryUOM: input.secondaryUOM?.trim() || null,
          categoryId: input.categoryId || null,
          subcategoryId: input.subcategoryId || null,
          brand: input.brand?.trim() || null,
          description: input.description?.trim() || null,
          imageUrl: input.imageUrl?.trim() || null,
          aliasName: input.aliasName?.trim() || null,
          searchKeywords: (input.searchKeywords ?? []).map((k) => k.trim()).filter(Boolean),
          status: input.status ?? "ACTIVE",
          minStockLevel: input.minStockLevel ?? 0,
          hsnCode: input.hsnCode?.trim() || null,
          taxRate: input.taxRate ?? 0,
          customFields: input.customFields ?? {},
        },
      });
      if (input.secondaryUOM?.trim() && input.conversionFactor && input.conversionFactor > 0) {
        await tx.uOMConversion.create({
          data: {
            itemId: created.id,
            fromUOM: input.defaultUOM.trim(),
            toUOM: input.secondaryUOM.trim(),
            conversionFactor: input.conversionFactor,
          },
        });
      }
      return created;
    });
    revalidatePath("/owner/inventory");
    return { success: true, item };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "An item with this code or SKU already exists" };
    }
    return { error: "Failed to create item" };
  }
}

export async function updateItem(input: ItemInput) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  if (!input.id) return { error: "Missing item id" };

  const existing = await prisma.product.findFirst({
    where: { id: input.id, factoryId: owner.factoryId },
  });
  if (!existing) return { error: "Item not found" };

  const itemType = await resolveItemType(owner.factoryId, input.categoryId);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: input.id },
        data: {
          name: input.name.trim(),
          itemCode: input.itemCode?.trim() || existing.itemCode,
          sku: input.sku?.trim() || existing.sku,
          itemType,
          defaultUOM: input.defaultUOM.trim(),
          secondaryUOM: input.secondaryUOM?.trim() || null,
          categoryId: input.categoryId || null,
          subcategoryId: input.subcategoryId || null,
          brand: input.brand?.trim() || null,
          description: input.description?.trim() || null,
          imageUrl: input.imageUrl?.trim() || null,
          aliasName: input.aliasName?.trim() || null,
          searchKeywords: (input.searchKeywords ?? []).map((k) => k.trim()).filter(Boolean),
          status: input.status ?? existing.status,
          minStockLevel: input.minStockLevel ?? existing.minStockLevel,
          hsnCode: input.hsnCode?.trim() || null,
          taxRate: input.taxRate ?? existing.taxRate,
          ...(input.customFields ? { customFields: input.customFields } : {}),
        },
      });
      // Rebuild the primary<->secondary conversion so an edit stays consistent.
      await tx.uOMConversion.deleteMany({ where: { itemId: input.id } });
      if (input.secondaryUOM?.trim() && input.conversionFactor && input.conversionFactor > 0) {
        await tx.uOMConversion.create({
          data: {
            itemId: input.id!,
            fromUOM: input.defaultUOM.trim(),
            toUOM: input.secondaryUOM.trim(),
            conversionFactor: input.conversionFactor,
          },
        });
      }
    });
    revalidatePath("/owner/inventory");
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "An item with this code or SKU already exists" };
    }
    return { error: "Failed to update item" };
  }
}

export async function setItemStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  const existing = await prisma.product.findFirst({ where: { id, factoryId: owner.factoryId } });
  if (!existing) return { error: "Item not found" };
  await prisma.product.update({ where: { id }, data: { status } });
  revalidatePath("/owner/inventory");
  return { success: true };
}

// Hard-delete an item. If it is referenced elsewhere (BOM, stock, purchase or
// sales history) the FK blocks it — deactivate instead so history stays intact.
export async function deleteItem(id: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };
  const existing = await prisma.product.findFirst({ where: { id, factoryId: owner.factoryId } });
  if (!existing) return { error: "Item not found" };

  // Clean up rows that are safe to remove with the item (its own conversions and
  // zero-effect balances); real transactional references are left to the FK.
  await prisma.uOMConversion.deleteMany({ where: { itemId: id } }).catch(() => {});
  try {
    await prisma.product.delete({ where: { id } });
    revalidatePath("/owner/inventory");
    revalidatePath("/owner/master-data");
    revalidatePath("/owner/settings/master-data/studio");
    return { success: true };
  } catch (error) {
    // describeDeleteError names the actual blocker — a BOM, stock history, an
    // order — which is the difference between a dead end and something the
    // owner can act on.
    return { error: describeDeleteError(error, "item") };
  }
}
