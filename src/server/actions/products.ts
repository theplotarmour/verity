"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { ItemType } from "@prisma/client";

export async function createProduct(name: string, skuPrefix?: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    let category = await prisma.productCategory.findFirst({ where: { factoryId: owner.factoryId } });
    if (!category) {
      category = await prisma.productCategory.create({
        data: { factoryId: owner.factoryId, name: "General" }
      });
    }

    const product = await prisma.product.create({
      data: {
        factoryId: owner.factoryId,
        categoryId: category.id,
        name
      }
    });
    revalidatePath("/owner/settings");
    return { success: true, product };
  } catch (error) {
    return { error: "Failed to create product" };
  }
}

export async function createProductVariant(productId: string, name: string, sku: string) {
  const owner = await getOwnerUser();
  if (!owner) return { error: "Unauthorized" };

  try {
    // 1. Create the unified Item record
    const item = await prisma.itemMaster.create({
      data: {
        factoryId: owner.factoryId,
        name: name,
        sku: sku,
        itemType: ItemType.FINISHED_PRODUCT,
        defaultUOM: "NOS"
      }
    });

    // 2. Create the ProductVariant
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        itemId: item.id,
        name,
        sku
      }
    });
    
    revalidatePath("/owner/settings");
    return { success: true, variant };
  } catch (error) {
    return { error: "Failed to create variant. Ensure SKU is unique." };
  }
}
