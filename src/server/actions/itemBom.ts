"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { getItemBomFor } from "@/server/queries/spec";
import { ensureItemBlueprint } from "./itemBlueprint";

function revalidate() {
  revalidatePath("/owner/master-data");
  revalidatePath("/owner/settings/master-data/studio");
}

export type ItemBomRow = {
  componentItemId: string;
  componentName: string;
  componentCode: string | null;
  uom: string | null;
  quantity: number;
  wastePercent: number;
  source: "group" | "contribution" | "override";
  sourceLabel: string;
};

/**
 * One item's BOM as it actually resolves: category recipe, plus what its
 * answers contribute, plus its own overrides.
 */
export async function listItemBom(itemId: string): Promise<ItemBomRow[]> {
  const user = await getOwnerUser();
  const lines = await getItemBomFor(user.factoryId, itemId);
  return lines.map((l) => ({
    componentItemId: l.itemId,
    componentName: l.component?.name ?? "(deleted item)",
    componentCode: l.component?.itemCode ?? null,
    uom: l.component?.defaultUOM ?? null,
    quantity: l.quantity,
    wastePercent: l.wastePercent,
    source: l.source,
    sourceLabel: l.sourceLabel,
  }));
}

/**
 * The category whose recipe this item inherits.
 *
 * Resolved per item, not from the sheet's active tab: the grid shows items from
 * descendant groups too, so a Leatherite row under the Fabric tab must point at
 * Leatherite's own recipe or an edit would land on the wrong category.
 */
export async function getItemRecipeTarget(itemId: string) {
  const user = await getOwnerUser();
  const item = await prisma.itemMaster.findFirst({
    where: { id: itemId, factoryId: user.factoryId },
    select: { group: { select: { id: true, name: true } } },
  });
  return item?.group ?? null;
}

/**
 * Pin a component's quantity on this item alone.
 *
 * Writing an override even when the number matches what was inherited is
 * deliberate: the owner has now *asserted* this quantity, and a later change to
 * the category recipe should not silently move it.
 */
export async function setItemBomLine(input: {
  itemId: string;
  componentItemId: string;
  quantity: number;
  wastePercent?: number;
}) {
  const user = await getOwnerUser();
  const item = await prisma.itemMaster.findFirst({
    where: { id: input.itemId, factoryId: user.factoryId },
    select: { id: true },
  });
  if (!item) return { error: "Item not found" };
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { error: "Quantity must be greater than zero" };
  }

  await prisma.itemBomOverride.upsert({
    where: {
      itemId_componentItemId: { itemId: input.itemId, componentItemId: input.componentItemId },
    },
    create: {
      factoryId: user.factoryId,
      itemId: input.itemId,
      componentItemId: input.componentItemId,
      quantity: input.quantity,
      wastePercent: input.wastePercent ?? 0,
      removed: false,
    },
    update: {
      quantity: input.quantity,
      wastePercent: input.wastePercent ?? 0,
      removed: false,
    },
  });

  revalidate();
  return { ok: true };
}

/**
 * Drop a component from this item.
 *
 * Recorded as a removal rather than a delete, because the line may be inherited
 * — deleting nothing would leave the category recipe putting it straight back.
 */
export async function removeItemBomLine(itemId: string, componentItemId: string) {
  const user = await getOwnerUser();
  await prisma.itemBomOverride.upsert({
    where: { itemId_componentItemId: { itemId, componentItemId } },
    create: {
      factoryId: user.factoryId,
      itemId,
      componentItemId,
      removed: true,
      quantity: 0,
    },
    update: { removed: true },
  });
  revalidate();
  return { ok: true };
}

/** Forget this item's override and go back to whatever it inherits. */
export async function clearItemBomOverride(itemId: string, componentItemId: string) {
  const user = await getOwnerUser();
  await prisma.itemBomOverride.deleteMany({
    where: { itemId, componentItemId, factoryId: user.factoryId },
  });
  revalidate();
  return { ok: true };
}

/**
 * Push this item's current BOM into its blueprint, so planned production uses it.
 *
 * Explicit rather than automatic: a BOM edit must not silently rewrite what a
 * job already in progress was costed and picked against.
 */
export async function rebuildItemBlueprint(itemId: string) {
  const user = await getOwnerUser();
  const item = await prisma.itemMaster.findFirst({
    where: { id: itemId, factoryId: user.factoryId },
    select: { id: true },
  });
  if (!item) return { error: "Item not found" };

  const { warnings } = await ensureItemBlueprint(itemId);
  revalidate();
  return { ok: true, warnings };
}
