"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { guardDelete } from "@/lib/server/prisma-errors";
import { revalidatePath } from "next/cache";
import { toFieldKey } from "@/lib/spec/key";
import { COLUMN_TYPES, columnTypeId } from "@/lib/spec/columns";
import { blockingReason, planAnswer, summarisePlans } from "@/lib/spec/retype";
import type { SpecFieldKind, SpecRefTarget, FieldType } from "@prisma/client";

function revalidate() {
  // The studio lives at /owner/master-data. Revalidating only the settings
  // route left its page cache untouched, so a column added or renamed here did
  // not appear until something else happened to refresh it — while the Add
  // wizard, which fetches through a server action, showed the new one
  // immediately. That is what "choices and columns not syncing" was.
  revalidatePath("/owner/master-data");
  revalidatePath("/owner/settings/master-data/studio");
}

export async function createSpecField(input: {
  groupId: string;
  name: string;
  kind: SpecFieldKind;
  valueType?: FieldType | null;
  unitSuffix?: string | null;
  refTarget?: SpecRefTarget | null;
  targetGroupId?: string | null;
  /** REFERENCE only. Which column of the target this picks from. */
  targetFieldId?: string | null;
  includeDescendants?: boolean;
  dependsOnFieldId?: string | null;
  isRequired?: boolean;
}) {
  const user = await getOwnerUser();
  const key = toFieldKey(input.name);

  // The key is what templates reference, so a collision within the group would
  // make {backType} ambiguous.
  const clash = await prisma.specField.findFirst({
    where: { groupId: input.groupId, key },
    select: { id: true, name: true },
  });
  if (clash) {
    return { error: `"${clash.name}" already uses the token {${key}} on this group` };
  }

  const count = await prisma.specField.count({ where: { groupId: input.groupId } });
  const field = await prisma.specField.create({
    data: {
      factoryId: user.factoryId,
      groupId: input.groupId,
      name: input.name.trim(),
      key,
      kind: input.kind,
      valueType: input.valueType ?? null,
      unitSuffix: input.unitSuffix?.trim() || null,
      refTarget: input.refTarget ?? null,
      targetGroupId: input.targetGroupId ?? null,
      targetFieldId: input.targetFieldId ?? null,
      includeDescendants: input.includeDescendants ?? true,
      dependsOnFieldId: input.dependsOnFieldId ?? null,
      isRequired: input.isRequired ?? false,
      sortOrder: count,
    },
  });
  revalidate();
  return field;
}

export async function updateSpecField(
  id: string,
  patch: {
    name?: string;
    isRequired?: boolean;
    sortOrder?: number;
    unitSuffix?: string | null;
    /** The template token. Slugified and checked for collisions on save. */
    key?: string;
    /** REFERENCE only: which sheet this points at. */
    targetGroupId?: string | null;
    /** REFERENCE only: which column of that sheet it picks from. */
    targetFieldId?: string | null;
    /** Parent column whose selection filters this one's options. */
    dependsOnFieldId?: string | null;
  }
) {
  const user = await getOwnerUser();

  const data: typeof patch & { key?: string } = { ...patch };

  // The key is a template token, so it must slugify and stay unique within the
  // group — otherwise {brand} would resolve to two different columns.
  if (patch.key !== undefined) {
    const current = await prisma.specField.findFirst({
      where: { id, factoryId: user.factoryId },
      select: { groupId: true },
    });
    if (!current) return { error: "Column not found" };
    const key = toFieldKey(patch.key);
    if (!key) return { error: "A token needs at least one letter or number." };
    const clash = await prisma.specField.findFirst({
      where: { groupId: current.groupId, key, id: { not: id } },
      select: { name: true },
    });
    if (clash) return { error: `"${clash.name}" already uses the token {${key}}.` };
    data.key = key;
  }

  // A column cannot depend on itself.
  if (patch.dependsOnFieldId && patch.dependsOnFieldId === id) {
    return { error: "A column cannot depend on itself." };
  }

  await prisma.specField.update({
    where: { id, factoryId: user.factoryId },
    data,
  });
  revalidate();
  return { ok: true as const };
}

/** Columns on a group, for the Configure inline editor's Target Column picker. */
export async function listGroupColumns(groupId: string) {
  const user = await getOwnerUser();
  const fields = await prisma.specField.findMany({
    where: { groupId, factoryId: user.factoryId, archivedAt: null },
    select: { id: true, name: true, key: true },
    orderBy: { sortOrder: "asc" },
  });
  return fields;
}


export async function addSpecFieldOption(
  fieldId: string,
  input: { value: string; label: string; shortCode?: string | null }
) {
  await getOwnerUser();
  const count = await prisma.specFieldOption.count({ where: { fieldId } });
  const option = await prisma.specFieldOption.create({
    data: {
      fieldId,
      value: input.value.trim(),
      label: input.label.trim(),
      shortCode: input.shortCode?.trim() || null,
      sortOrder: count,
    },
  });
  revalidate();
  return option;
}

export async function removeSpecFieldOption(id: string) {
  await getOwnerUser();
  const result = await guardDelete("option", () =>
    prisma.specFieldOption.delete({ where: { id } })
  );
  if ("error" in result) return result;
  revalidate();
  return result;
}

/**
 * Remove a field and everything answered against it.
 *
 * No archiving: a field the owner deletes is gone, and its answers go with it
 * (ItemFieldValue cascades from the field). The count is returned so the caller
 * can say how much went, rather than deleting silently.
 */
export async function deleteSpecField(id: string) {
  const user = await getOwnerUser();
  const field = await prisma.specField.findFirst({
    where: { id, factoryId: user.factoryId },
    select: { id: true, name: true, _count: { select: { values: true } } },
  });
  if (!field) return { error: "Field not found" };

  await prisma.specFieldOption.deleteMany({ where: { fieldId: id } });
  await prisma.specField.delete({ where: { id } });
  revalidate();
  return { deleted: true, answersRemoved: field._count.values };
}

/**
 * Set the column order for one group.
 *
 * Scoped deliberately: getResolvedFields merges ancestors in, so the strip a
 * subcategory renders contains fields it does not own. Accepting those ids
 * would let a drag on a child renumber its parent's columns for every sibling.
 */
export async function reorderSpecFields(groupId: string, orderedIds: string[]) {
  const user = await getOwnerUser();

  const owned = await prisma.specField.findMany({
    where: { groupId, factoryId: user.factoryId },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((f) => f.id));
  if (orderedIds.some((id) => !ownedIds.has(id))) {
    return { error: "Those columns belong to a parent category. Open it to reorder them." };
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.specField.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidate();
  return { ok: true as const };
}

/**
 * Fork an inherited field onto this group so it can be edited here.
 *
 * mergeInheritedFields prefers the deepest group for a given key, so a copy
 * sharing the key shadows the ancestor's without touching it — and without any
 * resolver change. Options come with it, or the new column would render empty.
 */
export async function overrideSpecField(fieldId: string, groupId: string) {
  const user = await getOwnerUser();

  const source = await prisma.specField.findFirst({
    where: { id: fieldId, factoryId: user.factoryId },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) return { error: "Field not found" };
  if (source.groupId === groupId) return { error: "That column already belongs here." };

  const clash = await prisma.specField.findFirst({
    where: { groupId, key: source.key },
    select: { name: true },
  });
  if (clash) return { error: `"${clash.name}" already uses {${source.key}} here.` };

  const count = await prisma.specField.count({ where: { groupId } });
  const copy = await prisma.specField.create({
    data: {
      factoryId: user.factoryId,
      groupId,
      name: source.name,
      key: source.key,
      kind: source.kind,
      valueType: source.valueType,
      unitSuffix: source.unitSuffix,
      refTarget: source.refTarget,
      targetGroupId: source.targetGroupId,
      includeDescendants: source.includeDescendants,
      // Dropped on purpose: the dependency points at a field on the ancestor,
      // and carrying it over would couple the fork back to the original.
      dependsOnFieldId: null,
      isRequired: source.isRequired,
      sortOrder: count,
      options: {
        create: source.options.map((o, i) => ({
          value: o.value,
          label: o.label,
          shortCode: o.shortCode,
          sortOrder: i,
        })),
      },
    },
  });
  revalidate();
  return { id: copy.id };
}

/**
 * Change a column's type, dry-run first.
 *
 * Blocked rather than cascaded where a BOM or another field relies on this
 * one: a recipe quietly losing its driver is a production-floor failure, not a
 * master-data inconvenience.
 */
export async function changeSpecFieldType(fieldId: string, toTypeId: string, apply: boolean) {
  const user = await getOwnerUser();

  const target = COLUMN_TYPES.find((t) => t.id === toTypeId);
  if (!target) return { error: "Unknown column type" };

  const field = await prisma.specField.findFirst({
    where: { id: fieldId, factoryId: user.factoryId },
    include: {
      dependents: { select: { name: true } },
      _count: { select: { bomLines: true } },
      options: { select: { id: true, _count: { select: { contributions: true } } } },
    },
  });
  if (!field) return { error: "Field not found" };

  const blocked = blockingReason({
    dependents: field.dependents,
    bomLineCount: field._count.bomLines,
    optionContributionCount: field.options.reduce((n, o) => n + o._count.contributions, 0),
  });
  if (blocked) return { error: blocked };

  const fromTypeId = columnTypeId(field.kind, field.valueType);
  if (fromTypeId === toTypeId) return { kept: 0, coerced: 0, cleared: 0 };

  const values = await prisma.itemFieldValue.findMany({
    where: { fieldId },
    select: {
      id: true,
      valueText: true,
      valueNumber: true,
      valueBool: true,
      option: { select: { label: true } },
    },
  });

  const plans = values.map((v) => ({
    id: v.id,
    plan: planAnswer(fromTypeId, toTypeId, {
      valueText: v.valueText,
      valueNumber: v.valueNumber,
      valueBool: v.valueBool,
      optionLabel: v.option?.label ?? null,
    }),
  }));
  const summary = summarisePlans(plans.map((p) => p.plan));

  if (!apply) return summary;

  await prisma.$transaction([
    ...plans
      .filter((p) => p.plan.action !== "keep")
      .map(({ id, plan }) =>
        prisma.itemFieldValue.update({
          where: { id },
          data:
            plan.action === "clear"
              ? { valueText: null, valueNumber: null, valueBool: null, optionId: null, valueItemId: null, valueRefId: null }
              : {
                  valueText: plan.next!.valueText,
                  valueNumber: plan.next!.valueNumber,
                  valueBool: plan.next!.valueBool,
                  optionId: null,
                  valueItemId: null,
                  valueRefId: null,
                },
        })
      ),
    // Options only mean anything on an option column; leaving them behind
    // would resurrect stale choices if the owner ever converted back.
    ...(target.kind !== "OPTION"
      ? [prisma.specFieldOption.deleteMany({ where: { fieldId } })]
      : []),
    prisma.specField.update({
      where: { id: fieldId },
      data: {
        kind: target.kind as SpecFieldKind,
        valueType: (target.valueType as FieldType | null) ?? null,
        unitSuffix: target.id === "MEASUREMENT" ? field.unitSuffix : null,
        refTarget: target.kind === "REFERENCE" ? field.refTarget : null,
        targetGroupId: target.kind === "REFERENCE" ? field.targetGroupId : null,
      },
    }),
  ]);

  revalidate();
  return summary;
}

