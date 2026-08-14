"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardModuleWrite } from "@/platform/modules/guard";

/**
 * Applying an assistant proposal (R4).
 *
 * This is the write half of "approve before apply". The assistant only ever
 * *proposes* — a read that returns an old→new diff. The write happens here, and
 * only here, when the owner clicks Approve.
 *
 * The proposal shown on screen is a preview, not the source of truth: this action
 * re-reads the item scoped to the session's factory and re-validates the price
 * from scratch. It trusts the item id and the new price and **nothing else** — no
 * old value, no tenant id, no name comes back from the client into the write. So a
 * tampered proposal can at most change a price the owner already had the right to
 * change, on an item that is already theirs.
 */

type ApplyResult =
  | { success: true; itemName: string; oldPricePaise: number; newPricePaise: number }
  | { error: string };

export async function applyPriceChange(itemId: string, newPricePaise: number): Promise<ApplyResult> {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await guardModuleWrite("menu");

  if (!Number.isInteger(newPricePaise) || newPricePaise <= 0) {
    return { error: "A price has to be a whole number of paise, above zero." };
  }
  // A sanity ceiling: an assistant that fat-fingers ₹9,999,999 for a chai should
  // be stopped here, not discovered on a bill. ₹1,00,000 is well above any dish.
  if (newPricePaise > 100_000 * 100) {
    return { error: "That price looks wrong — over ₹1,00,000. Set it on the menu screen instead." };
  }

  // Re-read scoped to the session's factory. The old price comes from here, never
  // from the proposal the client sent back.
  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, factoryId: user.factoryId },
    select: { id: true, name: true, price: true },
  });
  if (!item) return { error: "That item is no longer on your menu." };

  if (item.price === newPricePaise) {
    return { success: true, itemName: item.name, oldPricePaise: item.price, newPricePaise };
  }

  await prisma.menuItem.updateMany({
    where: { id: itemId, factoryId: user.factoryId },
    data: { price: newPricePaise },
  });

  await prisma.auditLog.create({
    data: {
      factoryId: user.factoryId,
      actorUserId: user.id,
      action: `Assistant proposal approved: ${item.name} price ${item.price} → ${newPricePaise} paise`,
      entityType: "MenuItem",
      entityId: item.id,
    },
  });

  revalidatePath("/owner/menu");
  revalidatePath("/owner/counter");
  return { success: true, itemName: item.name, oldPricePaise: item.price, newPricePaise };
}
