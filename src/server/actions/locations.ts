"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";

/**
 * Warehouses and stores — the places stock physically sits.
 *
 * These used to be a tab on the Master Data Sheets page, which is the wrong
 * home twice over: a warehouse is not master data the factory makes, and that
 * page is going away. They belong beside the stock they hold, so they live in
 * Inventory now and these are their own actions rather than a corner of
 * masterData.ts.
 */

const revalidate = () => {
  revalidatePath("/owner/inventory");
  revalidatePath("/owner/purchase");
};

export type LocationKind = "WAREHOUSE" | "STORE";

/**
 * A store is a place goods are dispatched *to*; a warehouse is where the
 * factory keeps its own stock. Same table, and the kind is what dispatch reads
 * to decide where an order can be delivered.
 */
export async function createLocation(input: { name: string; kind: LocationKind }) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const name = input.name.trim();
  if (!name) return { error: "Give the location a name" };

  const clash = await prisma.warehouse.findFirst({
    where: { factoryId: user.factoryId, name },
    select: { id: true },
  });
  if (clash) return { error: `"${name}" already exists` };

  const created = await prisma.warehouse.create({
    data: { name, kind: input.kind, factoryId: user.factoryId },
  });
  revalidate();
  return { id: created.id };
}

export async function renameLocation(id: string, name: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the location a name" };

  await prisma.warehouse.update({
    where: { id, factoryId: user.factoryId },
    data: { name: trimmed },
  });
  revalidate();
  return { ok: true };
}

export async function setLocationKind(id: string, kind: LocationKind) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };
  await prisma.warehouse.update({ where: { id, factoryId: user.factoryId }, data: { kind } });
  revalidate();
  return { ok: true };
}

/**
 * Refused while anything is still stored there.
 *
 * Deleting a location with stock in it would leave the ledger pointing at
 * nothing, and the quantities would simply vanish from every total — so the
 * count comes back in the message rather than as a foreign-key error.
 */
export async function deleteLocation(id: string) {
  const user = await getOwnerUser();
  if (!user) return { error: "Unauthorized" };

  const location = await prisma.warehouse.findFirst({
    where: { id, factoryId: user.factoryId },
    select: { id: true, name: true },
  });
  if (!location) return { error: "Location not found" };

  // Both hang off the bin, not the warehouse — stock is recorded at the shelf
  // it physically sits on, so the location has to be reached through the chain.
  const inThisLocation = { bin: { shelf: { rack: { zone: { warehouseId: id } } } } };
  const [balances, entries] = await Promise.all([
    prisma.binBalance.count({ where: inThisLocation }),
    prisma.stockLedgerEntry.count({ where: inThisLocation }),
  ]);
  if (balances > 0 || entries > 0) {
    return {
      error: `${location.name} still has stock movement recorded against it. Move the stock out first.`,
    };
  }

  await prisma.warehouse.delete({ where: { id } });
  revalidate();
  return { ok: true };
}
