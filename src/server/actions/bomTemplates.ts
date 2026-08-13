"use server";

import { guardModuleAction, guardModuleWrite } from "@/platform/modules/guard";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { descendantIds } from "@/lib/spec/resolve";

function revalidate() {
  revalidatePath("/owner/master-data");
  revalidatePath("/owner/settings/master-data/studio");
}

export type BomTemplateRow = {
  id: string;
  quantity: number;
  quantityFrom: string | null;
  wastePercent: number;
  sortOrder: number;
  itemId: string | null;
  itemName: string | null;
  sourceFieldId: string | null;
  sourceFieldName: string | null;
  quantityFromFieldId: string | null;
  quantityFromFieldName: string | null;
  quantityViaFieldId: string | null;
  quantityViaFieldName: string | null;
};

export async function listBomTemplateLines(groupId: string): Promise<BomTemplateRow[]> {
  const user = await getOwnerUser();
  await guardModuleAction("manufacturing");
  const lines = await prisma.bomTemplateLine.findMany({
    where: { groupId, factoryId: user.factoryId },
    include: {
      item: { select: { name: true } },
      sourceField: { select: { name: true } },
      quantityFromField: { select: { name: true } },
      quantityViaField: { select: { name: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return lines.map((l) => ({
    id: l.id,
    quantity: l.quantity,
    quantityFrom: l.quantityFrom,
    wastePercent: l.wastePercent,
    sortOrder: l.sortOrder,
    itemId: l.itemId,
    itemName: l.item?.name ?? null,
    sourceFieldId: l.sourceFieldId,
    sourceFieldName: l.sourceField?.name ?? null,
    quantityFromFieldId: l.quantityFromFieldId,
    quantityFromFieldName: l.quantityFromField?.name ?? null,
    quantityViaFieldId: l.quantityViaFieldId,
    quantityViaFieldName: l.quantityViaField?.name ?? null,
  }));
}

/**
 * Components an owner can pin to a BOM line: everything that is bought or
 * sub-assembled, i.e. not the finished goods this group produces.
 */
export async function listComponentItems() {
  const user = await getOwnerUser();
  await guardModuleAction("manufacturing");
  return prisma.itemMaster.findMany({
    where: {
      factoryId: user.factoryId,
      status: "ACTIVE",
      itemType: { in: ["RAW_MATERIAL", "SEMI_FINISHED", "CONSUMABLE", "PACKAGING"] },
      // Attribute categories (Vehicles, Brands, Models, Generations, Designs,
      // Colours) are RAW_MATERIAL-typed but are not things you consume, so the
      // component picker listed "Alto K10" and "2010-2020" as raw materials.
      group: { hasInventoryUnits: true },
    },
    select: { id: true, name: true, defaultUOM: true },
    orderBy: { name: "asc" },
  });
}

/** Reference fields on this group that point at items — each can drive a BOM line. */
export async function listItemReferenceFields(groupId: string) {
  const user = await getOwnerUser();
  await guardModuleAction("manufacturing");
  const groups = await prisma.itemGroup.findMany({
    where: { factoryId: user.factoryId },
    select: { id: true, parentId: true },
  });
  // Inherited fields count too, so a field defined on Fabric drives BOM lines
  // on Leatherite.
  const chain: string[] = [];
  const byId = new Map(groups.map((g) => [g.id, g]));
  let cur = byId.get(groupId);
  let guard = groups.length + 1;
  while (cur && guard-- > 0) {
    chain.push(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }

  return prisma.specField.findMany({
    where: {
      factoryId: user.factoryId,
      groupId: { in: chain },
      kind: "REFERENCE",
      refTarget: "ITEM_GROUP",
      archivedAt: null,
    },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
}

/**
 * Every item-reference field in the factory, deduplicated by template key.
 *
 * A contribution hangs off a *value*, not a group, so it can be resolved
 * against any item that answers that key — the fabric slot on a design applies
 * to seat covers and steering covers alike. The key is what matters, so two
 * groups both defining "fabric" appear once.
 */
export async function listAllItemReferenceFields() {
  const user = await getOwnerUser();
  await guardModuleAction("manufacturing");
  const fields = await prisma.specField.findMany({
    where: {
      factoryId: user.factoryId,
      kind: "REFERENCE",
      refTarget: "ITEM_GROUP",
      archivedAt: null,
    },
    select: { id: true, name: true, key: true, group: { select: { name: true } } },
    orderBy: [{ key: "asc" }, { sortOrder: "asc" }],
  });

  const seen = new Set<string>();
  return fields
    .filter((f) => (seen.has(f.key) ? false : (seen.add(f.key), true)))
    .map((f) => ({ id: f.id, name: f.name, key: f.key, groupName: f.group.name }));
}

export async function addBomTemplateLine(input: {
  groupId: string;
  itemId?: string | null;
  sourceFieldId?: string | null;
  quantity: number;
  quantityFrom?: string | null;
  quantityFromFieldId?: string | null;
  quantityViaFieldId?: string | null;
  wastePercent?: number;
}) {
  const user = await getOwnerUser();
  if (!input.itemId && !input.sourceFieldId) {
    return { error: "Pick either a fixed component or a field to take it from" };
  }
  const count = await prisma.bomTemplateLine.count({ where: { groupId: input.groupId } });
  await prisma.bomTemplateLine.create({
    data: {
      factoryId: user.factoryId,
      groupId: input.groupId,
      itemId: input.itemId || null,
      sourceFieldId: input.sourceFieldId || null,
      quantity: input.quantity,
      quantityFrom: input.quantityFrom || null,
      quantityFromFieldId: input.quantityFromFieldId || null,
      quantityViaFieldId: input.quantityViaFieldId || null,
      wastePercent: input.wastePercent ?? 0,
      sortOrder: count,
    },
  });
  revalidate();
  return { ok: true };
}

export type QuantityFieldOption = {
  id: string;
  name: string;
  viaFieldId: string | null;
  viaFieldName: string | null;
};

export async function listAvailableQuantityFields(groupId: string): Promise<QuantityFieldOption[]> {
  const user = await getOwnerUser();
  await guardModuleAction("manufacturing");

  const groups = await prisma.itemGroup.findMany({
    where: { factoryId: user.factoryId },
    select: { id: true, parentId: true },
  });
  const byId = new Map(groups.map((g) => [g.id, g]));

  const getAncestorChain = (id: string) => {
    const chain: string[] = [];
    let cur = byId.get(id);
    let guard = groups.length + 1;
    while (cur && guard-- > 0) {
      chain.push(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return chain;
  };

  const currentChain = getAncestorChain(groupId);

  // 1. Fetch numeric fields on the current category (and its ancestors)
  const currentNumericFields = await prisma.specField.findMany({
    where: {
      factoryId: user.factoryId,
      groupId: { in: currentChain },
      kind: "VALUE",
      valueType: "NUMBER",
      archivedAt: null,
    },
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  const options: QuantityFieldOption[] = currentNumericFields.map((f) => ({
    id: f.id,
    name: f.name,
    viaFieldId: null,
    viaFieldName: null,
  }));

  // 2. Fetch reference fields on the current category (and its ancestors)
  const referenceFields = await prisma.specField.findMany({
    where: {
      factoryId: user.factoryId,
      groupId: { in: currentChain },
      kind: "REFERENCE",
      refTarget: "ITEM_GROUP",
      archivedAt: null,
    },
    select: { id: true, name: true, targetGroupId: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const refField of referenceFields) {
    if (!refField.targetGroupId) continue;
    const targetChain = getAncestorChain(refField.targetGroupId);
    const targetNumericFields = await prisma.specField.findMany({
      where: {
        factoryId: user.factoryId,
        groupId: { in: targetChain },
        kind: "VALUE",
        valueType: "NUMBER",
        archivedAt: null,
      },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    });

    for (const f of targetNumericFields) {
      options.push({
        id: f.id,
        name: `${f.name} (via ${refField.name})`,
        viaFieldId: refField.id,
        viaFieldName: refField.name,
      });
    }
  }

  return options;
}

export async function removeBomTemplateLine(id: string) {
  const user = await getOwnerUser();
  await guardModuleWrite("manufacturing");
  await prisma.bomTemplateLine.delete({ where: { id, factoryId: user.factoryId } });
  revalidate();
}

/**
 * Re-render every item's name and code in a group from its current templates.
 *
 * Names are stored, not recomputed, so editing a template deliberately leaves
 * history alone. This is the explicit opt-in when the owner does want the change
 * applied. Preview first, then commit.
 */
export async function regenerateGroupNames(groupId: string, commit: boolean) {
  const user = await getOwnerUser();
  await guardModuleWrite("manufacturing");
  const { previewGroupRename } = await import("@/server/queries/rename");
  const changes = await previewGroupRename(groupId, user.factoryId);

  if (commit) {
    for (const c of changes) {
      await prisma.itemMaster.update({
        where: { id: c.id },
        data: { name: c.nextName, itemCode: c.nextCode },
      });
    }
    revalidate();
  }
  return changes;
}
