"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { createDefaultMasterData } from "@/lib/master-data/defaults";

/**
 * Create the default master-data shape for a brand-new factory: the six item
 * roots, and the record sheets for suppliers, customers, warehouses, employees,
 * designs and colours with their fields.
 *
 * Exists because the studio's empty state used to tell the owner to run
 * `node scripts/seed_item_groups.mjs`. A factory owner has no terminal, so that
 * message was a dead end on the very first screen they would ever see.
 *
 * Idempotent: it finds-or-creates, so pressing the button twice is harmless.
 */
export async function initialiseMasterData() {
  const user = await getOwnerUser();

  const existing = await prisma.itemGroup.count({ where: { factoryId: user.factoryId } });
  if (existing > 0) {
    // Not an error worth blocking on — the categories are what was wanted, and
    // they are already there.
    return { ok: true, created: 0 };
  }

  await createDefaultMasterData(prisma, user.factoryId);

  const created = await prisma.itemGroup.count({ where: { factoryId: user.factoryId } });
  revalidatePath("/owner/master-data");
  return { ok: true, created };
}
