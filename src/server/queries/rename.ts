import prisma from "@/lib/prisma";
import { groupChain, mergeInheritedFields, resolveAnswers, type RawAnswer } from "@/lib/spec/resolve";
import { renderTemplate } from "@/lib/spec/template";
import { loadRefLabels } from "./spec";
import { descendantIds } from "@/lib/spec/resolve";

export type RenameChange = {
  id: string;
  currentName: string;
  nextName: string;
  currentCode: string | null;
  nextCode: string;
  changed: boolean;
};

/**
 * What every item in a group would be called if its name and code were
 * re-rendered from the group's current templates. Read-only — the caller
 * decides whether to apply it.
 */
export async function previewGroupRename(
  groupId: string,
  factoryId: string
): Promise<RenameChange[]> {
  const groups = await prisma.itemGroup.findMany({ where: { factoryId } });
  const group = groups.find((g) => g.id === groupId);
  if (!group) return [];

  const allFields = await prisma.specField.findMany({
    where: { factoryId },
    include: { options: true },
  });

  const ids = descendantIds(groups, groupId);
  const items = await prisma.itemMaster.findMany({
    where: { factoryId, groupId: { in: ids } },
    include: {
      specValues: {
        include: {
          field: true,
          option: { select: { label: true, shortCode: true } },
          valueItem: { select: { name: true, aliasName: true, itemCode: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const refIds = items.flatMap((i) =>
    i.specValues.map((v) => v.valueRefId).filter((x): x is string => Boolean(x))
  );
  const refLabels = await loadRefLabels(refIds);

  const out: RenameChange[] = [];
  for (const item of items) {
    // Each item is rendered against its own group's templates and fields, so a
    // parent tab can regenerate a whole subtree in one action.
    const own = groups.find((g) => g.id === item.groupId) ?? group;
    const fields = mergeInheritedFields(
      groupChain(groups, own.id).map((g) => g.id),
      allFields
    );

    const raws: Record<string, RawAnswer> = {};
    for (const v of item.specValues) {
      raws[v.field.key] = {
        valueText: v.valueText,
        valueNumber: v.valueNumber,
        valueBool: v.valueBool,
        option: v.option,
        valueItem: v.valueItem,
        refLabel: v.valueRefId ? refLabels.get(v.valueRefId) ?? null : null,
        refCode: null,
      };
    }

    const resolved = resolveAnswers(fields as never, raws);
    resolved.group = { name: own.name, code: own.shortCode || own.name };

    const nextName = renderTemplate(own.nameTemplate ?? "{group}", resolved, "name");
    const nextCode = renderTemplate(own.codeTemplate ?? "{group}", resolved, "code");

    out.push({
      id: item.id,
      currentName: item.name,
      nextName: nextName || item.name,
      currentCode: item.itemCode,
      nextCode: nextCode || item.itemCode || "",
      changed: nextName !== item.name || nextCode !== item.itemCode,
    });
  }
  return out;
}
