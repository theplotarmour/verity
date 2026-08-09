"use server";

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { specHash } from "@/lib/spec/hash";
import { getResolvedFieldsFor, previewInheritedBomFor } from "@/server/queries/spec";
import type { SpecAnswer } from "@/lib/spec/types";
import { identityOf } from "@/lib/spec/identity";
import { expandCombinations, widestSelection, type MultiSelection } from "@/lib/spec/combinations";
import { writeBomEdits, isAttributeGroup, type BomEdit } from "@/lib/server/bomEdits";
import {
  createItemFromSpecFor,
  loadRenderContext,
  renderWithContext,
  renderFromAnswers,
  hashOf,
  resolveRefKeys,
} from "@/server/internal/itemEngine";

export async function previewSpecName(groupId: string, answers: Record<string, SpecAnswer>) {
  const user = await getOwnerUser();
  // Resolved first, so the name the owner watches assemble is the one that gets
  // stored — otherwise an unplaced key would show as a raw cuid right up until
  // save silently corrected it.
  const fields = await getResolvedFieldsFor(user.factoryId, groupId);
  const resolved = await resolveRefKeys(fields, answers);
  const { name, code } = await renderFromAnswers(groupId, resolved, user.factoryId);
  return { name, code };
}

export type VariantPreviewRow = {
  /** Stable across previews for the same combination, so ticks survive a refresh. */
  key: string;
  answers: Record<string, SpecAnswer>;
  name: string;
  code: string;
  /** Set when this exact spec is already an item — the row is not creatable. */
  existingName: string | null;
};

export type VariantPreview =
  | { rows: VariantPreviewRow[]; total: number; capped: false }
  | { rows: []; total: number; capped: true; narrow: string | null };

/**
 * Render every combination the owner's multi-selections describe.
 *
 * Duplicates are found here rather than at save time. The owner ticking forty
 * variants should learn which three already exist before committing, not
 * discover it as three failures afterwards.
 */
export async function previewSpecVariants(
  groupId: string,
  fixed: Record<string, SpecAnswer>,
  multi: MultiSelection[]
): Promise<VariantPreview> {
  const user = await getOwnerUser();
  // Same resolution as the single path: the fixed answers are copied onto every
  // row, so an unplaced key here would print a raw cuid into all forty names.
  const resolvedFixed = await resolveRefKeys(
    await getResolvedFieldsFor(user.factoryId, groupId),
    fixed
  );
  const { rows, total, capped } = expandCombinations(resolvedFixed, multi);

  if (capped) {
    const widest = widestSelection(multi);
    return { rows: [], total, capped: true, narrow: widest?.key ?? null };
  }

  const ctx = await loadRenderContext(user.factoryId, groupId, rows);
  if (!ctx.group) return { rows: [], total: 0, capped: false };

  const hashes = rows.map((answers) => hashOf(groupId, ctx.fields, answers));
  const existing = await prisma.itemMaster.findMany({
    where: { factoryId: user.factoryId, specHash: { in: hashes } },
    select: { specHash: true, name: true },
  });
  const existingByHash = new Map(existing.map((e) => [e.specHash, e.name]));

  return {
    rows: rows.map((answers, i) => ({
      key: hashes[i],
      answers,
      ...renderWithContext(ctx, answers),
      existingName: existingByHash.get(hashes[i]) ?? null,
    })),
    total,
    capped: false,
  };
}

export type BatchCreateResult = {
  created: number;
  skipped: number;
  failures: { name: string; error: string }[];
  warnings: string[];
};


/**
 * Create many items from one wizard pass.
 *
 * Each row is its own transaction: one bad combination must not cost the owner
 * the other thirty-nine. Failures come back named so they can be fixed
 * individually rather than by re-running the whole grid.
 */
export async function createItemsFromSpecBatch(input: {
  groupId: string;
  rows: {
    answers: Record<string, SpecAnswer>;
    /**
     * Per-variant BOM edits, written once the item exists — they cannot be saved
     * earlier, because both tables key on the item id the create call mints.
     */
    bomEdits?: BomEdit[];
  }[];
  defaultUOM: string;
  // Units describe the thing, not the variant, so every row in a batch shares
  // them — forty colourways of one fabric are all bought by the roll.
  secondaryUOM?: string | null;
  uomFactor?: number | null;
  aliasName?: string | null;
  status?: "ACTIVE" | "DRAFT";
}): Promise<BatchCreateResult> {
  const user = await getOwnerUser();
  const result: BatchCreateResult = { created: 0, skipped: 0, failures: [], warnings: [] };
  const warnings = new Set<string>();

  // Read once, not per row: every row in a batch is the same category, so the
  // question "is this an attribute or a produced SKU" has one answer.
  const isAttribute = await isAttributeGroup(user.factoryId, input.groupId);

  for (const row of input.rows) {
    const outcome = await createItemFromSpecFor(user.factoryId, {
      groupId: input.groupId,
      answers: row.answers,
      defaultUOM: input.defaultUOM,
      secondaryUOM: input.secondaryUOM ?? null,
      uomFactor: input.uomFactor ?? null,
      aliasName: input.aliasName ?? null,
      status: input.status,
    });

    if ("error" in outcome) {
      // An "already exists" is an expected outcome of a wide selection, not a
      // failure the owner needs to act on.
      if (outcome.error.startsWith("Already exists")) result.skipped += 1;
      else {
        const { name } = await renderFromAnswers(input.groupId, row.answers, user.factoryId);
        result.failures.push({ name: name || "(unnamed)", error: outcome.error });
      }
    } else {
      result.created += 1;
      for (const w of outcome.warnings) warnings.add(w);

      // Apply this variant's own BOM edits now that it has an id.
      for (const problem of await writeBomEdits(
        user.factoryId,
        outcome.id,
        isAttribute,
        row.bomEdits ?? []
      )) {
        warnings.add(problem);
      }
    }
  }

  result.warnings = [...warnings];
  return result;
}

/**
 * Create one item from the wizard.
 *
 * Takes BOM edits the same way the batch does, so adding a single design and
 * giving it its ingredients is one pass rather than save-then-open-the-item.
 */
export async function createItemFromSpec(input: {
  groupId: string;
  answers: Record<string, SpecAnswer>;
  defaultUOM: string;
  secondaryUOM?: string | null;
  uomFactor?: number | null;
  aliasName?: string | null;
  status?: "ACTIVE" | "DRAFT";
  bomEdits?: BomEdit[];
}): Promise<{ id: string; warnings: string[] } | { error: string }> {
  const user = await getOwnerUser();
  const outcome = await createItemFromSpecFor(user.factoryId, input);
  if ("error" in outcome || !input.bomEdits?.length) return outcome;

  const problems = await writeBomEdits(
    user.factoryId,
    outcome.id,
    await isAttributeGroup(user.factoryId, input.groupId),
    input.bomEdits
  );
  // The item is already saved, so a failed line is a warning on a success, not
  // an error that would suggest nothing was written.
  return { ...outcome, warnings: [...outcome.warnings, ...problems] };
}

/**
 * Change one answer on an existing item, then re-derive its identity.
 *
 * The name, code and hash are all functions of the answers, so editing a cell
 * has to rewrite them or the row would say one thing and mean another. The hash
 * moving is the point: it is what stops two rows drifting into the same spec.
 */
export async function updateItemAnswer(
  itemId: string,
  fieldId: string,
  answer: SpecAnswer
): Promise<{ name: string; code: string } | { error: string }> {
  const user = await getOwnerUser();

  const item = await prisma.itemMaster.findFirst({
    where: { id: itemId, factoryId: user.factoryId },
    select: { id: true, groupId: true },
  });
  if (!item?.groupId) return { error: "Item not found" };

  const isEmpty =
    !answer.optionId &&
    !answer.valueItemId &&
    !answer.valueRefId &&
    (answer.valueNumber === null || answer.valueNumber === undefined) &&
    (answer.valueBool === null || answer.valueBool === undefined) &&
    !answer.valueText;

  if (isEmpty) {
    await prisma.itemFieldValue.deleteMany({ where: { itemId, fieldId } });
  } else {
    await prisma.itemFieldValue.upsert({
      where: { itemId_fieldId: { itemId, fieldId } },
      create: {
        factoryId: user.factoryId,
        itemId,
        fieldId,
        valueText: answer.valueText ?? null,
        valueNumber: answer.valueNumber ?? null,
        valueBool: answer.valueBool ?? null,
        optionId: answer.optionId ?? null,
        valueItemId: answer.valueItemId ?? null,
        valueRefId: answer.valueRefId ?? null,
      },
      update: {
        valueText: answer.valueText ?? null,
        valueNumber: answer.valueNumber ?? null,
        valueBool: answer.valueBool ?? null,
        optionId: answer.optionId ?? null,
        valueItemId: answer.valueItemId ?? null,
        valueRefId: answer.valueRefId ?? null,
      },
    });
  }

  // Re-derive from everything the item now answers.
  const fields = await getResolvedFieldsFor(user.factoryId, item.groupId);
  const stored = await prisma.itemFieldValue.findMany({ where: { itemId } });
  const byField = new Map(stored.map((v) => [v.fieldId, v]));

  const answers: Record<string, SpecAnswer> = {};
  const identities: Record<string, string> = {};
  for (const f of fields) {
    const v = byField.get(f.id);
    if (!v) continue;
    const a: SpecAnswer = {
      valueText: v.valueText,
      valueNumber: v.valueNumber,
      valueBool: v.valueBool,
      optionId: v.optionId,
      valueItemId: v.valueItemId,
      valueRefId: v.valueRefId,
    };
    answers[f.key] = a;
    identities[f.key] = identityOf(a);
  }

  const { name, code } = await renderFromAnswers(item.groupId, answers, user.factoryId);
  const hash = specHash(item.groupId, identities);

  const clash = await prisma.itemMaster.findFirst({
    where: { factoryId: user.factoryId, specHash: hash, id: { not: itemId } },
    select: { name: true },
  });
  if (clash) return { error: `That change would duplicate "${clash.name}"` };

  await prisma.itemMaster.update({
    where: { id: itemId },
    data: { name: name || undefined, itemCode: code || undefined, specHash: hash },
  });

  revalidatePath("/owner/master-data");
  return { name, code };
}

/**
 * What a not-yet-created SKU would inherit, given the answers picked so far.
 *
 * The wizard's thin wrapper over previewInheritedBomFor — the session supplies
 * the factory, the query does the work.
 */
export async function previewInheritedBom(
  groupId: string,
  answers: Record<string, SpecAnswer>
) {
  const user = await getOwnerUser();
  return previewInheritedBomFor(user.factoryId, groupId, answers);
}
