// The item-creation engine: naming, identity hashing, unique codes, and the
// create itself with the factory passed in.
//
// Deliberately not "use server". createItemFromSpecFor takes a factoryId, so as
// an exported action it was an open invitation to mint items inside another
// tenant's catalogue. Its callers — the wizard's own actions and the order
// path's item resolver — are server-side, so nothing is lost by making this a
// plain module that cannot be called over the wire.

import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { revalidatePath } from "next/cache";
import { specHash } from "@/lib/spec/hash";
import { renderTemplate } from "@/lib/spec/template";
import { resolveAnswers, type RawAnswer } from "@/lib/spec/resolve";
import { getResolvedFieldsFor, loadRefLabels } from "@/server/queries/spec";
import { buildItemBlueprint } from "@/server/actions/itemBlueprint";
import type { SpecAnswer } from "@/lib/spec/types";
import { identityOf } from "@/lib/spec/identity";
import { normaliseUnits } from "@/lib/item-units";
import { needsRefiling, refileRefKey } from "@/lib/spec/refile";
import { Prisma } from "@prisma/client";

type RenderContext = Awaited<ReturnType<typeof loadRenderContext>>;

/**
 * Load everything needed to render names for one group: the group, its resolved
 * fields, and the labels of every item and reference answered across *all* the
 * answer sets passed in.
 *
 * Batched deliberately. The variant grid renders up to 200 names at once, and
 * loading labels per row would turn one preview into hundreds of queries.
 */
export async function loadRenderContext(
  factoryId: string,
  groupId: string,
  answerSets: Record<string, SpecAnswer>[]
) {
  const [group, fields] = await Promise.all([
    prisma.itemGroup.findFirst({ where: { id: groupId, factoryId } }),
    getResolvedFieldsFor(factoryId, groupId),
  ]);

  const itemIds = new Set<string>();
  const refIds = new Set<string>();
  const optionIds = new Set<string>();
  for (const answers of answerSets) {
    for (const a of Object.values(answers)) {
      if (a?.valueItemId) itemIds.add(a.valueItemId);
      if (a?.valueRefId) refIds.add(a.valueRefId);
      if (a?.optionId) optionIds.add(a.optionId);
    }
  }

  const [items, refLabels, options] = await Promise.all([
    itemIds.size
      ? prisma.itemMaster.findMany({
          where: { id: { in: [...itemIds] } },
          select: { id: true, name: true, aliasName: true, itemCode: true },
        })
      : Promise.resolve([]),
    loadRefLabels([...refIds]),
    // An option picked on a referencing sub-column is not in that field's own
    // options list, so the by-field lookup in renderWithContext misses it and the
    // cell renders blank. Loading every selected option by id gives a fallback.
    optionIds.size
      ? prisma.specFieldOption.findMany({
          where: { id: { in: [...optionIds] } },
          select: { id: true, label: true, shortCode: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    group,
    fields,
    itemById: new Map(items.map((i) => [i.id, i])),
    optionById: new Map(options.map((o) => [o.id, o])),
    refLabels,
  };
}

/** Render one answer set against an already-loaded context. No I/O. */
export function renderWithContext(ctx: RenderContext, answers: Record<string, SpecAnswer>) {
  if (!ctx.group) return { name: "", code: "" };

  const raws: Record<string, RawAnswer> = {};
  for (const field of ctx.fields) {
    const a = answers[field.key];
    if (!a) continue;
    const option = a.optionId
      ? field.options.find((o) => o.id === a.optionId) ?? ctx.optionById.get(a.optionId) ?? null
      : null;
    raws[field.key] = {
      valueText: a.valueText ?? null,
      valueNumber: a.valueNumber ?? null,
      valueBool: a.valueBool ?? null,
      option: option ? { label: option.label, shortCode: option.shortCode } : null,
      valueItem: a.valueItemId ? ctx.itemById.get(a.valueItemId) ?? null : null,
      refLabel: a.valueRefId ? ctx.refLabels.get(a.valueRefId) ?? null : null,
      refCode: null,
    };
  }

  const resolved = resolveAnswers(ctx.fields as never, raws);
  // {group} is always available even though it is not a spec field.
  resolved.group = { name: ctx.group.name, code: ctx.group.shortCode || ctx.group.name };

  return {
    name: renderTemplate(ctx.group.nameTemplate ?? "{group}", resolved, "name"),
    code: renderTemplate(ctx.group.codeTemplate ?? "{group}", resolved, "code"),
  };
}

/**
 * Resolve a set of answers into the name and code they render to.
 * Shared by the live preview and by create, so the name the owner watches
 * assemble is exactly the name that gets stored.
 */
export async function renderFromAnswers(
  groupId: string,
  answers: Record<string, SpecAnswer>,
  factoryId?: string
) {
  const user = factoryId ? { factoryId } : await getOwnerUser();
  const ctx = await loadRenderContext(user.factoryId, groupId, [answers]);
  if (!ctx.group) return { name: "", code: "", fields: [], group: null };
  return { ...renderWithContext(ctx, answers), fields: ctx.fields, group: ctx.group };
}

/**
 * Place any key the form could not, against what the database actually holds.
 *
 * The form hands over a bare `refKey` when it cannot tell whether a picked id
 * is an option or an item — which happens routinely, because the dropdown list
 * it used to look this up in is filtered as the owner narrows and emptied
 * outright while a dependent column waits on its parent. Guessing there wrote
 * raw cuids into the database as text, and those ids then printed into the
 * item's own name.
 *
 * One query per target column, not per answer: a forty-row variant batch
 * resolves the same handful of columns over and over.
 */
export async function resolveRefKeys(
  fields: { key: string; kind: string; targetFieldId?: string | null; targetGroupId?: string | null }[],
  answers: Record<string, SpecAnswer>
): Promise<Record<string, SpecAnswer>> {
  const pending = fields.filter(
    (f) => f.kind === "REFERENCE" && needsRefiling(answers[f.key] ?? {})
  );
  if (pending.length === 0) return answers;

  const out = { ...answers };
  for (const field of pending) {
    const key = answers[field.key]!.refKey!;
    if (field.targetFieldId) {
      const [option, item] = await Promise.all([
        prisma.specFieldOption.findFirst({
          where: { id: key, fieldId: field.targetFieldId },
          select: { id: true },
        }),
        prisma.itemMaster.findFirst({ where: { id: key }, select: { id: true } }),
      ]);
      out[field.key] = refileRefKey(key, {
        optionIds: new Set(option ? [option.id] : []),
        itemIds: new Set(item ? [item.id] : []),
      });
    } else {
      // Direct reference to another sheet (headrest / armrest / backtype): the
      // key is the picked item's id, with no sub-column to disambiguate against.
      out[field.key] = { valueItemId: key };
    }
  }
  return out;
}

/** The hash identity of one answer set against a group's resolved fields. */
export function hashOf(
  groupId: string,
  fields: { key: string }[],
  answers: Record<string, SpecAnswer>
): string {
  const identities: Record<string, string> = {};
  for (const field of fields) {
    const a = answers[field.key];
    if (a) identities[field.key] = identityOf(a);
  }
  return specHash(groupId, identities);
}


/** SKU is globally unique in ItemMaster; suffix until free. */
export async function ensureUniqueSku(base: string) {
  const clean = base.trim() || `ITEM-${Date.now().toString(36).toUpperCase()}`;
  let candidate = clean;
  for (let i = 2; ; i++) {
    const exists = await prisma.itemMaster.findUnique({
      where: { sku: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    candidate = `${clean}-${i}`;
  }
}

/** Item codes are unique per factory; append a stable counter when a template is too broad. */
export async function ensureUniqueItemCode(factoryId: string, base: string) {
  const clean = base.trim() || `ITEM-${Date.now().toString(36).toUpperCase()}`;
  const existing = await prisma.itemMaster.findMany({
    where: {
      factoryId,
      OR: [{ itemCode: clean }, { itemCode: { startsWith: `${clean}-` } }],
    },
    select: { itemCode: true },
  });
  const used = new Set(existing.map((item) => item.itemCode).filter(Boolean));
  if (!used.has(clean)) return clean;

  for (let i = 1; ; i++) {
    const candidate = `${clean}-${String(i).padStart(4, "0")}`;
    if (!used.has(candidate)) return candidate;
  }
}


/**
 * Item creation with the factory passed in, and the option to return an
 * existing item when the spec already matches.
 *
 * `reuseExisting` is what lets order taking resolve a spec to an item without
 * caring whether it is the first time that combination has been sold.
 */
export async function createItemFromSpecFor(
  factoryId: string,
  input: {
    groupId: string;
    answers: Record<string, SpecAnswer>;
    defaultUOM: string;
    /** Optional purchase unit, with how many `defaultUOM` are in one of it. */
    secondaryUOM?: string | null;
    uomFactor?: number | null;
    aliasName?: string | null;
    status?: "ACTIVE" | "DRAFT";
    reuseExisting?: boolean;
  }
): Promise<{ id: string; warnings: string[] } | { error: string }> {
  const user = { factoryId };

  // Checked before anything is written: a bad factor caught here is a sentence
  // the owner can act on, where the same mistake stored is a stock quantity
  // that is wrong on every receipt from now on.
  const units = normaliseUnits({
    primaryUOM: input.defaultUOM,
    secondaryUOM: input.secondaryUOM,
    factor: input.uomFactor,
  });
  if (!units.ok) return { error: units.error };

  const { name, code, fields, group } = await renderFromAnswers(
    input.groupId,
    input.answers,
    factoryId
  );
  if (!group) return { error: "Unknown item group" };
  if (!name) return { error: "Fill at least one field before saving" };

  const missing = fields.filter((f) => f.isRequired && !input.answers[f.key]);
  if (missing.length) {
    return { error: `Missing required field: ${missing.map((f) => f.name).join(", ")}` };
  }

  // A referenced item can be deleted while a form still holds its id — an open
  // tab, or a re-seed underneath. Caught here it names the field to re-pick;
  // left to the database it is a raw foreign-key 500 with nothing actionable.
  const referenced = fields
    .map((f) => ({ field: f, id: input.answers[f.key]?.valueItemId }))
    .filter((r): r is { field: (typeof fields)[number]; id: string } => Boolean(r.id));
  if (referenced.length) {
    const live = await prisma.itemMaster.findMany({
      where: { factoryId: user.factoryId, id: { in: referenced.map((r) => r.id) } },
      select: { id: true },
    });
    const liveIds = new Set(live.map((i) => i.id));
    const stale = referenced.filter((r) => !liveIds.has(r.id));
    if (stale.length) {
      return {
        error: `No longer available: ${stale
          .map((s) => s.field.name)
          .join(", ")}. Re-pick ${stale.length === 1 ? "it" : "them"} and save again.`,
      };
    }
  }

  // Decide any keys the form could not place, before they reach the hash — two
  // items differing only in how the client happened to file the same answer
  // must not read as two different specs.
  const answers = await resolveRefKeys(fields, input.answers);

  const hash = hashOf(input.groupId, fields, answers);

  const existing = await prisma.itemMaster.findFirst({
    where: { factoryId: user.factoryId, specHash: hash },
    select: { id: true, name: true },
  });
  if (existing) {
    // Order taking wants the item, not an error: the same seat cover sold twice
    // is one item, which is the whole point of hashing the answers.
    if (input.reuseExisting) return { id: existing.id, warnings: [] };
    return { error: `Already exists: ${existing.name}` };
  }

  const itemCode = await ensureUniqueItemCode(user.factoryId, code);
  const sku = await ensureUniqueSku(itemCode);

  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.itemMaster.create({
        data: {
          factoryId: user.factoryId,
          groupId: input.groupId,
          itemType: group.itemType,
          name,
          itemCode,
          sku,
          aliasName: input.aliasName?.trim() || null,
          defaultUOM: units.units.primaryUOM,
          secondaryUOM: units.units.secondaryUOM,
          status: input.status ?? "ACTIVE",
          specHash: hash,
          manufacturingType:
            group.isProducible && group.isPurchasable
              ? "BOTH"
              : group.isProducible
                ? "MAKE"
                : "BUY",
        },
      });

      // Stored the way a storekeeper says it — a roll is fifty metres, not a
      // metre is one-fiftieth of a roll — matching what setItemUnits writes so
      // getItemUnits can read either back.
      if (units.units.secondaryUOM && units.units.factor) {
        await tx.uOMConversion.create({
          data: {
            itemId: created.id,
            fromUOM: units.units.secondaryUOM,
            toUOM: units.units.primaryUOM,
            conversionFactor: units.units.factor,
          },
        });
      }

      for (const field of fields) {
        const a = answers[field.key];
        if (!a) continue;
        await tx.itemFieldValue.create({
          data: {
            factoryId: user.factoryId,
            itemId: created.id,
            fieldId: field.id,
            valueText: a.valueText ?? null,
            valueNumber: a.valueNumber ?? null,
            valueBool: a.valueBool ?? null,
            optionId: a.optionId ?? null,
            valueItemId: a.valueItemId ?? null,
            valueRefId: a.valueRefId ?? null,
          },
        });
      }
      return created;
    });

    // Producible items get their blueprint, QC template, route and BOM from
    // the group, so the owner never enters them twice. Gaps come back as
    // warnings rather than blocking the save.
    const { warnings } = await buildItemBlueprint(user.factoryId, item.id);

    // Cache invalidation is a hint, and this path also runs from scripts and
    // backfills where there is no request to revalidate.
    try {
      revalidatePath("/owner/master-data");
      revalidatePath("/owner/settings/master-data/studio");
    } catch {
      // outside a request scope
    }
    return { id: item.id, warnings };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "";
      if (target.includes("itemCode")) {
        return {
          error: `Generated item code "${itemCode}" already exists. Try saving again or adjust the code template.`,
        };
      }
      if (target.includes("specHash")) {
        const duplicate = await prisma.itemMaster.findFirst({
          where: { factoryId: user.factoryId, specHash: hash },
          select: { id: true, name: true },
        });
        if (input.reuseExisting && duplicate) return { id: duplicate.id, warnings: [] };
        return { error: `Already exists: ${duplicate?.name ?? name}` };
      }
      return { error: "An item with this generated identity already exists" };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      // Something an answer points at was deleted between the check above and
      // the write. Rare, but the owner should still get a sentence, not a 500.
      return {
        error: "One of the values you picked was deleted while you were filling this in. Reopen the form and pick again.",
      };
    }
    throw error;
  }
}
