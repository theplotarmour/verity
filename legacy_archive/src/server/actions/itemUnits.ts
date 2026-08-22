"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { normaliseUnits } from "@/lib/item-units";
import { revalidatePath } from "next/cache";

export type ItemUnits = {
  primaryUOM: string;
  secondaryUOM: string | null;
  /** How many primary units are in one secondary unit. 1 Roll = 50 Meter → 50. */
  factor: number | null;
};

export async function getItemUnits(itemId: string): Promise<ItemUnits | null> {
  const user = await getOwnerUser();
  const item = await prisma.product.findFirst({
    where: { id: itemId, factoryId: user.factoryId },
    select: {
      defaultUOM: true,
      secondaryUOM: true,
      conversions: { select: { fromUOM: true, toUOM: true, conversionFactor: true } },
    },
  });
  if (!item) return null;

  // Stored as "1 secondary = factor primary", which is how a storekeeper says
  // it: a roll is fifty metres, not a metre is one-fiftieth of a roll.
  const row = item.conversions.find(
    (c) => c.fromUOM === item.secondaryUOM && c.toUOM === item.defaultUOM
  );
  return {
    primaryUOM: item.defaultUOM,
    secondaryUOM: item.secondaryUOM,
    factor: row?.conversionFactor ?? null,
  };
}

/**
 * Set an item's stocking unit and its optional purchase unit.
 *
 * A conversion is only meaningful with both a secondary unit and a factor, so
 * clearing either removes the row rather than leaving a half-defined rule that
 * a goods receipt would silently apply.
 */
export async function setItemUnits(input: {
  itemId: string;
  primaryUOM: string;
  secondaryUOM?: string | null;
  factor?: number | null;
}) {
  const user = await getOwnerUser();
  const item = await prisma.product.findFirst({
    where: { id: input.itemId, factoryId: user.factoryId },
    select: { id: true, defaultUOM: true, secondaryUOM: true },
  });
  if (!item) return { error: "Item not found" };

  // The same rule the Add wizard applies, so an item created with a purchase
  // unit and one given it later end up with identical rows.
  const checked = normaliseUnits(input);
  if (!checked.ok) return { error: checked.error };
  const { primaryUOM: primary, secondaryUOM: secondary, factor } = checked.units;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: item.id },
      data: { defaultUOM: primary, secondaryUOM: secondary },
    });
    // Rewritten rather than patched: the units themselves may have changed, so
    // the old row's fromUOM/toUOM no longer describe anything.
    await tx.uOMConversion.deleteMany({ where: { itemId: item.id } });
    if (secondary && factor) {
      await tx.uOMConversion.create({
        data: { itemId: item.id, fromUOM: secondary, toUOM: primary, conversionFactor: factor },
      });
    }
  });

  revalidatePath("/owner/master-data");
  revalidatePath("/owner/inventory");
  return { ok: true };
}

/** Units the owner has already used, so the pickers suggest rather than dictate. */
export async function listUsedUnits() {
  const user = await getOwnerUser();
  const rows = await prisma.product.findMany({
    where: { factoryId: user.factoryId },
    select: { defaultUOM: true, secondaryUOM: true },
    distinct: ["defaultUOM"],
  });
  const set = new Set<string>();
  for (const r of rows) {
    if (r.defaultUOM) set.add(r.defaultUOM);
    if (r.secondaryUOM) set.add(r.secondaryUOM);
  }
  return [...set].sort();
}
