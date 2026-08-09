"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { createItemFromSpec } from "./itemsFromSpec";
import type { SpecAnswer } from "@/lib/spec/types";

/**
 * Create an item from the order studio when a customer wants something the
 * catalog does not have.
 *
 * The item is immediately usable and produceable; DRAFT only marks it for the
 * owner's review. If the spec already matches an existing item, that item is
 * returned instead — the order proceeds either way and no duplicate is created,
 * which is the whole point of hashing the answer tuple.
 */
export async function mintDraftItem(groupId: string, answers: Record<string, SpecAnswer>) {
  const result = await createItemFromSpec({
    groupId,
    answers,
    defaultUOM: "PCS",
    status: "DRAFT",
  });
  if ("id" in result) return result;

  const duplicate = result.error.startsWith("Already exists: ");
  if (!duplicate) return result;

  const user = await getOwnerUser();
  const existing = await prisma.itemMaster.findFirst({
    where: {
      factoryId: user.factoryId,
      groupId,
      name: result.error.replace("Already exists: ", ""),
    },
    select: { id: true },
  });
  return existing ?? result;
}

export async function listDraftItems() {
  const user = await getOwnerUser();
  return prisma.itemMaster.findMany({
    where: { factoryId: user.factoryId, status: "DRAFT" },
    include: { group: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Owner review: a draft becomes part of the approved catalog. */
export async function promoteDraftItem(id: string) {
  const user = await getOwnerUser();
  await prisma.itemMaster.update({
    where: { id, factoryId: user.factoryId },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/owner/master-data");
  revalidatePath("/owner/settings/master-data/studio");
}
