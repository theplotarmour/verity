"use server";

import prisma from "@/lib/prisma";
import { guardDelete } from "@/lib/server/prisma-errors";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import type { ItemType } from "@prisma/client";

function revalidate() {
  // The studio lives at /owner/master-data. Revalidating only the settings
  // route left its page cache untouched, so a column added or renamed here did
  // not appear until something else happened to refresh it — while the Add
  // wizard, which fetches through a server action, showed the new one
  // immediately. That is what "choices and columns not syncing" was.
  revalidatePath("/owner/master-data");
  revalidatePath("/owner/settings/master-data/studio");
}

export async function listItemGroups() {
  const user = await getOwnerUser();
  return prisma.itemGroup.findMany({
    where: { factoryId: user.factoryId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createItemGroup(input: {
  name: string;
  itemType: ItemType;
  parentId?: string | null;
  shortCode?: string | null;
}) {
  const user = await getOwnerUser();

  // A subgroup always takes its parent's type — a group under Raw Material
  // cannot hold finished goods, and letting the caller pass a type would make
  // that contradiction expressible.
  let itemType = input.itemType;
  if (input.parentId) {
    const parent = await prisma.itemGroup.findFirst({
      where: { id: input.parentId, factoryId: user.factoryId },
      select: { itemType: true },
    });
    if (!parent) return { error: "Parent group not found" };
    itemType = parent.itemType;
  }

  const clash = await prisma.itemGroup.findFirst({
    where: { factoryId: user.factoryId, parentId: input.parentId ?? null, name: input.name.trim() },
    select: { id: true },
  });
  if (clash) return { error: `"${input.name.trim()}" already exists here` };

  const group = await prisma.itemGroup.create({
    data: {
      factoryId: user.factoryId,
      name: input.name.trim(),
      itemType,
      parentId: input.parentId ?? null,
      shortCode: input.shortCode?.trim() || null,
      isSheet: !input.parentId,
      // A category holding finished or semi-finished goods is something the
      // factory produces, so it must be producible for its items to appear in
      // the production and order-taking search. Defaulting to false hid every
      // item created under a freshly made finished-goods subfolder.
      isProducible: itemType === "FINISHED_PRODUCT" || itemType === "SEMI_FINISHED",
    },
  });

  // Auto-linking: nesting a subcategory under another subcategory (e.g. Model
  // under Brand, or Family under Category) creates a reference column on the
  // child pointing at the parent. That relation is what makes cascading filters
  // work — picking Maruti then only offers Maruti's models, not every brand's.
  //
  // Only fires when the parent is itself a subgroup (has its own parentId). A
  // subgroup directly under a root sheet gets no auto-column: the root is the
  // sheet, not a filterable dimension.
  if (input.parentId) {
    const parentGroup = await prisma.itemGroup.findFirst({
      where: { id: input.parentId, factoryId: user.factoryId },
      select: { id: true, name: true, parentId: true },
    });

    if (parentGroup && parentGroup.parentId) {
      // Slug the parent name into a template key. Guard the three built-in
      // column keys so the reference never shadows id/name/code.
      let baseKey = parentGroup.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      if (!baseKey || baseKey === "id" || baseKey === "name" || baseKey === "code") {
        baseKey = `${baseKey || "ref"}_ref`;
      }

      // @@unique([groupId, key]) enforces this at the DB, but resolve the key
      // up front so we insert a clean one instead of catching a violation.
      let key = baseKey;
      let suffix = 1;
      while (
        await prisma.specField.findFirst({
          where: { groupId: group.id, key },
          select: { id: true },
        })
      ) {
        key = `${baseKey}_${suffix++}`;
      }

      await prisma.specField.create({
        data: {
          factoryId: user.factoryId,
          groupId: group.id,
          name: parentGroup.name,
          key,
          kind: "REFERENCE",
          refTarget: "ITEM_GROUP",
          targetGroupId: parentGroup.id,
          sortOrder: 0,
        },
      });
    }
  }

  revalidate();
  return group;
}

/**
 * Add a new top-level category — a seventh root beside the six seeded ones.
 *
 * Roots are not special in the schema: they are simply groups with no parent, so
 * a new one gets the recursive subcategory tree, Configure mode and data grid
 * for free. It carries no domainType, because those are record sheets backed by
 * their own tables and cannot be invented from a name.
 *
 * Takes a name and nothing else. Kind is defaulted here and set in Configure
 * mode, where there is room to explain what it decides — asking for it at the
 * moment of typing a name is a question with no context attached to it.
 */
export async function createRootGroup(input: { name: string }) {
  const user = await getOwnerUser();
  const name = input.name.trim();
  if (!name) return { error: "Name is required" };

  const clash = await prisma.itemGroup.findFirst({
    where: { factoryId: user.factoryId, parentId: null, name: { equals: name, mode: "insensitive" } },
    select: { name: true },
  });
  if (clash) return { error: `A top-level category called "${clash.name}" already exists.` };

  const last = await prisma.itemGroup.findFirst({
    where: { factoryId: user.factoryId, parentId: null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const group = await prisma.itemGroup.create({
    data: {
      factoryId: user.factoryId,
      name,
      itemType: "RAW_MATERIAL",
      parentId: null,
      isSheet: true,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  revalidate();
  return { id: group.id };
}

/**
 * The name and code templates for a group.
 *
 * Deliberately does not touch existing items: their names and codes are stored
 * columns, so editing a template changes what future items are called and
 * leaves history alone.
 */
export async function updateGroupTemplates(
  id: string,
  templates: { nameTemplate?: string; codeTemplate?: string }
) {
  const user = await getOwnerUser();
  await prisma.itemGroup.update({
    where: { id, factoryId: user.factoryId },
    data: {
      nameTemplate: templates.nameTemplate?.trim() || null,
      codeTemplate: templates.codeTemplate?.trim() || null,
    },
  });
  revalidate();
}

export async function renameItemGroup(id: string, name: string) {
  const user = await getOwnerUser();
  await prisma.itemGroup.update({
    where: { id, factoryId: user.factoryId },
    data: { name: name.trim() },
  });
  revalidate();
}

/**
 * Delete a category, but only when nothing depends on it.
 *
 * The checks are done here rather than left to the database because a foreign
 * key violation tells the owner "delete failed" and nothing else. Knowing it is
 * *three subcategories* or *forty items* in the way is the difference between
 * an actionable message and a dead end.
 */
export async function deleteItemGroup(id: string) {
  const user = await getOwnerUser();

  const group = await prisma.itemGroup.findFirst({
    where: { id, factoryId: user.factoryId },
    select: {
      name: true,
      isSystem: true,
      _count: { select: { items: true, children: true, specFields: true } },
    },
  });
  if (!group) return { error: "Category not found" };

  // System roots drive order booking, stock and production. An empty one could
  // still be deleted before this guard, which silently broke those flows.
  if (group.isSystem) {
    return { error: `${group.name} is a system category and cannot be deleted. You can rename it instead.` };
  }

  if (group._count.children > 0) {
    const n = group._count.children;
    return { error: `Delete the ${n} subcategor${n === 1 ? "y" : "ies"} inside ${group.name} first.` };
  }
  if (group._count.items > 0) {
    const n = group._count.items;
    return { error: `${group.name} still holds ${n} item${n === 1 ? "" : "s"}. Move or delete them first.` };
  }

  const result = await guardDelete("item group", () =>
    prisma.itemGroup.delete({ where: { id, factoryId: user.factoryId } })
  );
  if ("error" in result) return result;
  revalidate();
  return result;
}

/**
 * Everything Configure mode's settings panel writes: the category's name, the
 * Kind that decides where its items show up elsewhere, and the headers for the
 * three built-in columns.
 */
export async function updateGroupSettings(
  groupId: string,
  patch: {
    name?: string;
    itemType?: ItemType;
    codeLabel?: string | null;
    nameLabel?: string | null;
    aliasLabel?: string | null;
    aliasHidden?: boolean;
    hasInventoryUnits?: boolean;
    /** Null is a real choice — "inherit from my parent" — not "leave alone". */
    bomMode?: "OFF" | "RECIPE" | "INGREDIENTS" | null;
  }
) {
  const user = await getOwnerUser();

  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) return { error: "Name is required" };

  // A system root may be renamed to the factory's own vocabulary ("Finished
  // Good" -> "Corrugated Boxes"), but its type is what production, stock and
  // order booking resolve against, so retyping it is refused.
  if (patch.itemType !== undefined) {
    const target = await prisma.itemGroup.findFirst({
      where: { id: groupId, factoryId: user.factoryId },
      select: { name: true, isSystem: true, itemType: true },
    });
    if (target?.isSystem && target.itemType !== patch.itemType) {
      return { error: `${target.name} is a system category — its type cannot be changed.` };
    }
  }

  if (name) {
    const clash = await prisma.itemGroup.findFirst({
      where: {
        factoryId: user.factoryId,
        id: { not: groupId },
        parentId: null,
        name: { equals: name, mode: "insensitive" },
      },
      select: { name: true },
    });
    if (clash) return { error: `A category called "${clash.name}" already exists.` };
  }

  await prisma.itemGroup.update({
    where: { id: groupId, factoryId: user.factoryId },
    data: {
      ...(name ? { name } : {}),
      ...(patch.itemType ? { itemType: patch.itemType } : {}),
      // A blank label means "back to the default word", stored as null.
      ...(patch.codeLabel !== undefined ? { codeLabel: patch.codeLabel?.trim() || null } : {}),
      ...(patch.nameLabel !== undefined ? { nameLabel: patch.nameLabel?.trim() || null } : {}),
      ...(patch.aliasLabel !== undefined ? { aliasLabel: patch.aliasLabel?.trim() || null } : {}),
      ...(patch.aliasHidden !== undefined ? { aliasHidden: patch.aliasHidden } : {}),
      ...(patch.hasInventoryUnits !== undefined ? { hasInventoryUnits: patch.hasInventoryUnits } : {}),
      ...(patch.bomMode !== undefined ? { bomMode: patch.bomMode } : {}),
    },
  });
  revalidate();
  return { ok: true as const };
}
