"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";

function revalidate() {
  revalidatePath("/owner/master-data");
  revalidatePath("/owner/settings/master-data/studio");
}

/** What a contribution hangs off. Exactly one is set. */
export type ContributionOwner =
  | { kind: "OPTION"; id: string }
  | { kind: "REF"; id: string }
  | { kind: "ITEM"; id: string };

export type ContributionRow = {
  id: string;
  componentItemId: string | null;
  componentName: string | null;
  sourceFieldId: string | null;
  sourceFieldName: string | null;
  quantity: number;
  quantityFrom: string | null;
  wastePercent: number;
};

function ownerWhere(owner: ContributionOwner) {
  if (owner.kind === "OPTION") return { optionId: owner.id };
  if (owner.kind === "REF") return { refId: owner.id };
  return { ownerItemId: owner.id };
}

export async function listContributions(owner: ContributionOwner): Promise<ContributionRow[]> {
  const user = await getOwnerUser();
  const rows = await prisma.bomContribution.findMany({
    where: { factoryId: user.factoryId, ...ownerWhere(owner) },
    include: {
      componentItem: { select: { name: true } },
      sourceField: { select: { name: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    componentItemId: r.componentItemId,
    componentName: r.componentItem?.name ?? null,
    sourceFieldId: r.sourceFieldId,
    sourceFieldName: r.sourceField?.name ?? null,
    quantity: r.quantity,
    quantityFrom: r.quantityFrom,
    wastePercent: r.wastePercent,
  }));
}

/**
 * Attach a component to a value, so choosing that value anywhere brings the
 * component with it.
 *
 * Entered once on the design; applied to every vehicle that uses it. That reuse
 * is the whole reason this lives on the value rather than as a condition on
 * each category's recipe.
 */
export async function addContribution(input: {
  owner: ContributionOwner;
  componentItemId?: string | null;
  sourceFieldId?: string | null;
  quantity: number;
  quantityFrom?: string | null;
  wastePercent?: number;
}) {
  const user = await getOwnerUser();
  if (!input.componentItemId && !input.sourceFieldId) {
    return { error: "Pick either a component or a field to take it from" };
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { error: "Quantity must be greater than zero" };
  }

  const where = ownerWhere(input.owner);
  const count = await prisma.bomContribution.count({
    where: { factoryId: user.factoryId, ...where },
  });

  await prisma.bomContribution.create({
    data: {
      factoryId: user.factoryId,
      ...where,
      componentItemId: input.componentItemId || null,
      sourceFieldId: input.sourceFieldId || null,
      quantity: input.quantity,
      quantityFrom: input.quantityFrom || null,
      wastePercent: input.wastePercent ?? 0,
      sortOrder: count,
    },
  });

  revalidate();
  return { ok: true };
}

export async function removeContribution(id: string) {
  const user = await getOwnerUser();
  await prisma.bomContribution.deleteMany({ where: { id, factoryId: user.factoryId } });
  revalidate();
  return { ok: true };
}

/**
 * How many items already resolve a contribution from this value.
 *
 * Shown before a delete, because removing a design's piping quietly changes the
 * BOM of every seat cover using that design.
 */
export async function countItemsUsingOwner(owner: ContributionOwner): Promise<number> {
  const user = await getOwnerUser();
  const where =
    owner.kind === "OPTION"
      ? { optionId: owner.id }
      : owner.kind === "REF"
        ? { valueRefId: owner.id }
        : { valueItemId: owner.id };
  const values = await prisma.itemFieldValue.findMany({
    where: { factoryId: user.factoryId, ...where },
    select: { itemId: true },
    distinct: ["itemId"],
  });
  return values.length;
}
