// Deliberately not "use server". buildItemBlueprint takes a factoryId, and an
// exported action taking one is an invitation to write blueprints into someone
// else's factory. Both entry points here are called server-to-server —
// ensureItemBlueprint from itemBom's own action, buildItemBlueprint from the
// item path and from scripts — so neither needs to be an endpoint.

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { getItemBomFor } from "@/server/queries/spec";
import {
  type BomModeValue,
  DEFAULT_BOM_MODE,
  resolveBomModeFromTree,
} from "@/lib/master-data/bom-mode";

export type BlueprintResult = {
  blueprintVersionId: string | null;
  warnings: string[];
};

/**
 * The BOM mode a category actually operates under, inheriting up the parent
 * chain. See `lib/master-data/bom-mode.ts` for why null means "inherit".
 *
 * Takes `factoryId` rather than reading a session, for the same reason nothing
 * else in this file is a `"use server"` export: a bare group id from a caller
 * would read another tenant's category tree.
 */
export async function resolveBomMode(
  factoryId: string,
  groupId: string | null | undefined,
): Promise<BomModeValue> {
  if (!groupId) return DEFAULT_BOM_MODE;

  // The whole tenant's tree in one query. A recursive per-level walk would be a
  // round trip per ancestor, and these trees are small — tens of rows, not
  // thousands. Scoped to the factory so a foreign id resolves to the default
  // rather than to someone else's setting.
  const groups = await prisma.itemGroup.findMany({
    where: { factoryId },
    select: { id: true, parentId: true, bomMode: true },
  });

  return resolveBomModeFromTree(groupId, groups);
}

/**
 * Give a producible item a blueprint with an active version, its QC template
 * attached, its route copied in and its BOM expanded from the group template.
 *
 * This is what makes "configure the group once" true: the owner sets the recipe,
 * QC template and route on the group, and every item created from it inherits
 * them without a second data-entry step.
 *
 * Warnings rather than failures. An item whose fabric is unanswered should still
 * be created and visible with the gap reported — refusing to save would strand
 * the owner mid-form with no way to record what he does know.
 */
export async function ensureItemBlueprint(itemId: string): Promise<BlueprintResult> {
  const user = await getOwnerUser();
  return buildItemBlueprint(user.factoryId, itemId);
}

/**
 * The blueprint assembly itself, with the factory passed in — callable from a
 * backfill script or a test without a request context.
 */
export async function buildItemBlueprint(
  factoryId: string,
  itemId: string
): Promise<BlueprintResult> {
  const user = { factoryId };
  const warnings: string[] = [];

  const item = await prisma.itemMaster.findFirst({
    where: { id: itemId, factoryId: user.factoryId },
    include: { group: true },
  });
  if (!item) return { blueprintVersionId: null, warnings: ["Item not found"] };

  // Bought items have no recipe. They still appear in other items' BOMs.
  if (item.manufacturingType === "BUY") return { blueprintVersionId: null, warnings };

  const existing = await prisma.blueprint.findUnique({
    where: { itemId },
    include: { versions: true },
  });
  const activeVersion = existing?.versions.find((v) => v.isActive);
  if (activeVersion) return { blueprintVersionId: activeVersion.id, warnings };

  const group = item.group;
  // A category carries one checklist per department; the blueprint version pins
  // the QC one, since that is the inspection the passport is built from.
  const qcChecklistId = group
    ? (
        await prisma.checklistTemplate.findFirst({
          where: {
            factoryId: user.factoryId,
            status: "active",
            defaultForItemGroups: { some: { id: group.id } },
            ownerDepartment: { isQcStage: true },
          },
          select: { id: true },
        })
      )?.id ?? null
    : null;
  const blueprint =
    existing ??
    (await prisma.blueprint.create({
      data: { factoryId: user.factoryId, itemId },
    }));

  const version = await prisma.blueprintVersion.create({
    data: {
      blueprintId: blueprint.id,
      versionNumber: (existing?.versions.length ?? 0) + 1,
      name: "V1 - Standard",
      qcTemplateId: qcChecklistId,
      isActive: true,
    },
  });
  await prisma.blueprint.update({
    where: { id: blueprint.id },
    data: { activeVersionId: version.id },
  });

  if (!qcChecklistId) {
    warnings.push(`No default QC template on ${group?.name ?? "this group"}`);
  }

  // Route — an ordered list of departments copied into real route steps.
  const route =
    (group?.defaultRouteJson as { departmentId: string; estimatedTimeMins?: number }[] | null) ??
    [];
  for (const [i, step] of route.entries()) {
    await prisma.blueprintRouteStep.create({
      data: {
        blueprintVersionId: version.id,
        departmentId: step.departmentId,
        sequence: i,
        estimatedTimeMins: step.estimatedTimeMins ?? 0,
      },
    });
  }
  if (route.length === 0) {
    warnings.push(`No default route on ${group?.name ?? "this group"}`);
  }

  // BOM — expanded from the group template against this item's answers.
  const lines = await getItemBomFor(factoryId, itemId);
  if (lines.length === 0) {
    warnings.push(
      "BOM is empty — check the group's recipe and whether this item's material fields are answered"
    );
  } else {
    const bom = await prisma.bOM.create({
      data: { factoryId: user.factoryId, blueprintVersionId: version.id },
    });
    for (const l of lines) {
      await prisma.bOMItem.create({
        data: {
          bomId: bom.id,
          itemId: l.itemId,
          quantity: l.quantity,
          wastePercent: l.wastePercent,
        },
      });
    }
  }

  return { blueprintVersionId: version.id, warnings };
}
