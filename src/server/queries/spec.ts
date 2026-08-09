import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getOwnerUser } from "@/lib/server/owner";
import { groupChain, mergeInheritedFields, descendantIds, findLinkColumn } from "@/lib/spec/resolve";
import { expandBomTemplate, resolveItemBom, type BomContributionShape } from "@/lib/spec/bom";
import { columnKeys, type TargetRow } from "@/lib/spec/column-options";
import type { RefOption, SpecAnswer } from "@/lib/spec/types";

/**
 * Every spec field visible on a group, with ancestors merged in and options
 * included. This is the shape the wizard, the sheet and CSV all render from.
 */
export async function getResolvedFields(groupId: string) {
  const user = await getOwnerUser();
  return getResolvedFieldsFor(user.factoryId, groupId);
}

/** Same, with the factory passed in — for scripts, tests and the order path. */
export async function getResolvedFieldsFor(factoryId: string, groupId: string) {
  const user = { factoryId };
  const [groups, fields] = await Promise.all([
    prisma.itemGroup.findMany({
      where: { factoryId: user.factoryId },
      select: { id: true, parentId: true },
    }),
    prisma.specField.findMany({
      where: { factoryId: user.factoryId },
      include: { options: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const chain = groupChain(groups, groupId).map((g) => g.id);
  return mergeInheritedFields(chain, fields);
}

const search = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(" ").toLowerCase();

/**
 * How many rows a single dropdown will read.
 *
 * The list is filtered in the browser, so without a bound every keystroke-ready
 * dropdown costs a full scan of its target category — fine for the few hundred
 * items a factory starts with, ruinous once a real catalogue lands. This is a
 * ceiling on the damage, not a search: the honest fix is to send the typed
 * query to the server and filter in SQL, which changes SpecSelect as well and
 * belongs in its own change. Until then a category past this size will offer
 * only its first rows, which is visible and complainable — unlike a page that
 * quietly takes ten seconds.
 */
const OPTION_SCAN_LIMIT = 1000;

/**
 * Turn what the owner typed into a database filter.
 *
 * Unordered tokens, like the list itself: "napa heavy" finds "Heavy Napa". Each
 * word must match somewhere, which is what makes a second word narrow rather
 * than restart. Empty query means no filter, so the first open still shows the
 * head of the list.
 */
function searchTerms(query: string | undefined) {
  return (query ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Options for a REFERENCE field.
 *
 * `parentValueId` is the answer to the field's dependsOn field — passing it
 * filters models by brand and generations by model.
 *
 * Vehicle models and generations are scoped through their parent relation
 * rather than their own factoryId, because those columns are nullable and a
 * direct filter would silently drop rows.
 */
/**
 * The values one column of the target category takes, given what has already
 * been chosen on its siblings.
 *
 * The target's own rows are the authority. Reading each column independently
 * would offer the union — Swift under Tata — because nothing in a column on its
 * own records which brand it belongs to; only the row it sits on does.
 *
 * An answer is keyed by whatever identifies it: the option id for a
 * pick-from-list column, the linked item for a reference, the text otherwise.
 * That keeps a renameable thing renameable — picking Tata stores the option,
 * not the word, so correcting its spelling later corrects every seat cover.
 */
async function getColumnOptions(
  factoryId: string,
  targetGroupId: string,
  field: { targetFieldId: string | null; includeDescendants: boolean },
  filters?: Record<string, string>,
  query?: string
): Promise<RefOption[]> {
  if (!field.targetFieldId) return [];

  const groups = await prisma.itemGroup.findMany({
    where: { factoryId },
    select: { id: true, parentId: true },
  });
  const groupIds = field.includeDescendants
    ? descendantIds(groups, targetGroupId)
    : [targetGroupId];

  // Only the columns in play: the one being offered, plus any already answered.
  const wanted = new Set<string>([field.targetFieldId, ...Object.keys(filters ?? {})]);

  // Narrow by the typed text against the very column being offered: a row
  // qualifies when its value for that column matches, whatever shape the value
  // takes — a picked option, a linked item, or plain text.
  const terms = searchTerms(query);
  const matching = terms.length
    ? {
        AND: terms.map((t) => ({
          specValues: {
            some: {
              fieldId: field.targetFieldId!,
              OR: [
                { valueText: { contains: t, mode: "insensitive" as const } },
                { option: { label: { contains: t, mode: "insensitive" as const } } },
                { valueItem: { name: { contains: t, mode: "insensitive" as const } } },
                { valueItem: { aliasName: { contains: t, mode: "insensitive" as const } } },
              ],
            },
          },
        })),
      }
    : {};

  const items = await prisma.itemMaster.findMany({
    where: {
      factoryId,
      groupId: { in: groupIds },
      status: { in: ["ACTIVE", "DRAFT"] },
      ...matching,
    },
    select: {
      id: true,
      specValues: {
        where: { fieldId: { in: [...wanted] } },
        select: {
          fieldId: true,
          valueText: true,
          valueNumber: true,
          optionId: true,
          valueItemId: true,
          valueRefId: true,
          option: { select: { id: true, label: true, shortCode: true } },
          valueItem: { select: { id: true, name: true, aliasName: true, itemCode: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: OPTION_SCAN_LIMIT,
  });

  type Shown = { label: string; sublabel: string | null; kind: "option" | "item" | "text" };
  const labels = new Map<string, Shown>();

  const rows: TargetRow[] = items.map((item) => {
    const values: Record<string, string | null> = {};
    for (const v of item.specValues) {
      // The key has to survive a rename, so an option or a linked item is
      // identified by its id and only plain text falls back to itself.
      const shown: Shown | null = v.option
        ? { label: v.option.label, sublabel: v.option.shortCode, kind: "option" }
        : v.valueItem
          ? {
              label: v.valueItem.aliasName || v.valueItem.name,
              sublabel: v.valueItem.itemCode,
              kind: "item",
            }
          : v.valueText
            ? { label: v.valueText, sublabel: null, kind: "text" }
            : v.valueNumber !== null
              ? { label: String(v.valueNumber), sublabel: null, kind: "text" }
              : null;
      if (!shown) continue;

      const key = v.optionId ?? v.valueItemId ?? v.valueRefId ?? shown.label;
      values[v.fieldId] = key;
      if (!labels.has(key)) labels.set(key, shown);
    }
    return { itemId: item.id, values };
  });

  return columnKeys(rows, field.targetFieldId, filters ?? {}).map((key) => {
    const shown = labels.get(key);
    const label = shown?.label ?? key;
    return {
      id: key,
      label,
      sublabel: shown?.sublabel ?? null,
      searchText: search(label, shown?.sublabel),
      kind: shown?.kind ?? "text",
    };
  });
}

export async function getReferenceOptions(
  fieldId: string,
  parentValueId?: string,
  /**
   * Answers already given to sibling columns pointing at the same category,
   * as target field id -> chosen key. Only used when this field picks from a
   * column; it is what keeps Maruti's models out of Tata's list.
   */
  filters?: Record<string, string>,
  /** What the owner has typed into the box, filtered in SQL rather than here. */
  query?: string
): Promise<RefOption[]> {
  const user = await getOwnerUser();
  const field = await prisma.specField.findFirst({
    where: { id: fieldId, factoryId: user.factoryId },
  });
  if (!field || field.kind !== "REFERENCE" || !field.refTarget) return [];

  // Pointed at one column of the target rather than at its records: the answer
  // is a value that column takes, narrowed to combinations that actually exist.
  if (field.targetFieldId && field.targetGroupId) {
    return getColumnOptions(user.factoryId, field.targetGroupId, field, filters, query);
  }

  switch (field.refTarget) {
    case "ITEM_GROUP": {
      if (!field.targetGroupId) return [];
      const groups = await prisma.itemGroup.findMany({
        where: { factoryId: user.factoryId },
        select: { id: true, parentId: true },
      });
      const ids = field.includeDescendants
        ? descendantIds(groups, field.targetGroupId)
        : [field.targetGroupId];

      // Narrowing by the answer to another column: pick a brand, and only its
      // models are offered. The parent's category is known from the field this
      // one depends on; the link back is the target's own column pointing at it.
      //
      // Only the hardcoded vehicle tables could do this before, which is why it
      // has to exist before vehicles can become ordinary categories — without it
      // every model in the factory would show under every brand.
      let narrowing = {};
      if (parentValueId && field.dependsOnFieldId) {
        const parentField = await prisma.specField.findFirst({
          where: { id: field.dependsOnFieldId, factoryId: user.factoryId },
          select: { targetGroupId: true },
        });
        if (parentField?.targetGroupId) {
          const targetFields = await getResolvedFieldsFor(user.factoryId, field.targetGroupId);
          const link = findLinkColumn(targetFields, parentField.targetGroupId);
          // No link column means the two categories are not related, so there is
          // nothing to narrow by and the full list is the honest answer.
          if (link) {
            narrowing = {
              specValues: { some: { fieldId: link.id, valueItemId: parentValueId } },
            };
          }
        }
      }

      // Typed text is answered in SQL. Reading the category and filtering in
      // the browser meant every dropdown paid for the whole catalogue, and the
      // scan cap turned that into rows the owner could not reach at all.
      const terms = searchTerms(query);
      const matching = terms.length
        ? {
            AND: terms.map((t) => ({
              OR: [
                { name: { contains: t, mode: "insensitive" as const } },
                { aliasName: { contains: t, mode: "insensitive" as const } },
                { itemCode: { contains: t, mode: "insensitive" as const } },
              ],
            })),
          }
        : {};

      const items = await prisma.itemMaster.findMany({
        where: {
          factoryId: user.factoryId,
          groupId: { in: ids },
          status: { in: ["ACTIVE", "DRAFT"] },
          ...narrowing,
          ...matching,
        },
        select: { id: true, name: true, aliasName: true, itemCode: true },
        orderBy: { name: "asc" },
        take: OPTION_SCAN_LIMIT,
      });
      return items.map((i) => ({
        id: i.id,
        label: i.aliasName || i.name,
        sublabel: i.itemCode,
        searchText: search(i.name, i.aliasName, i.itemCode),
        kind: "item" as const,
      }));
    }

    // VEHICLE_BRAND, VEHICLE_MODEL, VEHICLE_GENERATION and DESIGN are gone.
    // They read bespoke tables that only ever held one factory's idea of what
    // a vehicle is. A factory that needs them builds the categories itself and
    // links to those, which is what every other reference already does.

    case "SUPPLIER": {
      const rows = await prisma.supplier.findMany({
        where: { factoryId: user.factoryId },
        orderBy: { name: "asc" },
      });
      return rows.map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: r.phone ?? r.email ?? null,
        searchText: search(r.name, r.phone, r.email, r.gst),
      }));
    }

    case "CUSTOMER": {
      const rows = await prisma.customer.findMany({
        where: { factoryId: user.factoryId },
        orderBy: { name: "asc" },
      });
      return rows.map((r) => ({
        id: r.id,
        label: r.companyName || r.name,
        sublabel: r.phone ?? r.customerCode ?? null,
        searchText: search(r.name, r.companyName, r.phone, r.customerCode),
      }));
    }

    case "WAREHOUSE": {
      const rows = await prisma.warehouse.findMany({
        where: { factoryId: user.factoryId },
        orderBy: { name: "asc" },
      });
      return rows.map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: r.kind,
        searchText: search(r.name, r.kind),
      }));
    }

    case "WAREHOUSE_BIN": {
      const rows = await prisma.warehouseBin.findMany({
        where: { shelf: { rack: { zone: { warehouse: { factoryId: user.factoryId } } } } },
        include: { shelf: { include: { rack: { include: { zone: { include: { warehouse: true } } } } } } },
        orderBy: { name: "asc" },
      });
      return rows.map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: `${r.shelf.rack.zone.warehouse.name} / ${r.shelf.rack.zone.name}`,
        searchText: search(r.name, r.shelf.name, r.shelf.rack.name, r.shelf.rack.zone.name, r.shelf.rack.zone.warehouse.name),
      }));
    }

    case "EMPLOYEE": {
      const rows = await prisma.user.findMany({
        where: { factoryId: user.factoryId },
        orderBy: { name: "asc" },
      });
      return rows.map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: r.role,
        searchText: search(r.name, r.phone, r.role),
      }));
    }

    case "DEPARTMENT": {
      const rows = await prisma.department.findMany({
        where: { factoryId: user.factoryId, active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        label: r.name,
        sublabel: r.isQcStage ? "QC" : null,
        searchText: search(r.name, r.description),
      }));
    }

    case "MACHINE":
      return [];
  }

  // A refTarget the enum still carries but nothing handles any more — COLOR,
  // and the rest as they are converted to categories. An empty list is the
  // honest answer: there is no such table to read from.
  return [];
}

/**
 * Display labels for attribute-master references (vehicle, design, colour).
 *
 * These are stored as a bare `valueRefId` with no foreign key, because the
 * target table varies by the field's refTarget and Prisma cannot express a
 * polymorphic relation. Resolving them means one lookup per table, so callers
 * batch every id they need through here at once.
 */
export async function loadRefLabels(refIds: string[]): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (refIds.length === 0) return labels;

  const ids = [...new Set(refIds)];
  const [colors, suppliers, customers, warehouses, bins, employees, departments] = await Promise.all([
    // Colours are items now, so a colour reference carries valueItemId and is
    // resolved through that relation rather than looked up by a bare id here.
    Promise.resolve([] as { id: string; name: string }[]),
    prisma.supplier.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, companyName: true } }),
    prisma.warehouse.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    prisma.warehouseBin.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    prisma.department.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
  ]);

  for (const r of colors) labels.set(r.id, r.name);
  for (const r of suppliers) labels.set(r.id, r.name);
  for (const r of customers) labels.set(r.id, r.companyName || r.name);
  for (const r of warehouses) labels.set(r.id, r.name);
  for (const r of bins) labels.set(r.id, r.name);
  for (const r of employees) labels.set(r.id, r.name);
  for (const r of departments) labels.set(r.id, r.name);

  return labels;
}

export type SpecRow = {
  id: string;
  name: string;
  itemCode: string | null;
  aliasName: string | null;
  status: string;
  /** Display strings, keyed by field key. */
  cells: Record<string, string>;
  /** True when the item is made rather than bought — only these have a BOM. */
  producible?: boolean;
  /**
   * How the item is stocked and bought. Set in the Add form and, until now,
   * invisible everywhere afterwards — the sheet showed a fabric without saying
   * whether its numbers were metres or rolls.
   */
  units?: { primary: string; secondary: string | null; factor: number | null };
  /**
   * The raw answers behind those strings, so a cell can be edited in place
   * rather than only read. Empty for domain record sheets, which are not
   * spec-driven.
   */
  answers: Record<string, SpecAnswer>;
};

/** Items in a group, with every answer already flattened to a display string. */
export async function getGroupRows(groupId: string): Promise<SpecRow[]> {
  const user = await getOwnerUser();
  const group = await prisma.itemGroup.findFirst({
    where: { id: groupId, factoryId: user.factoryId },
    select: { name: true, parentId: true },
  });
  const groups = await prisma.itemGroup.findMany({
    where: { factoryId: user.factoryId },
    select: { id: true, parentId: true },
  });
  // A group's sheet shows its own items and everything filed beneath it, so a
  // parent tab is never mysteriously empty once subgroups exist.
  const ids = descendantIds(groups, groupId);

  const items = await prisma.itemMaster.findMany({
    where: { factoryId: user.factoryId, groupId: { in: ids } },
    include: {
      specValues: {
        include: {
          field: { select: { key: true, unitSuffix: true } },
          option: { select: { label: true } },
          valueItem: { select: { name: true, aliasName: true } },
        },
      },
      conversions: { select: { fromUOM: true, toUOM: true, conversionFactor: true } },
    },
    orderBy: { name: "asc" },
  });

  const refIds = items.flatMap((i) =>
    i.specValues.map((v) => v.valueRefId).filter((x): x is string => Boolean(x))
  );
  const refLabels = await loadRefLabels(refIds);

  return items.map((item) => {
    const cells: Record<string, string> = {};
    const answers: Record<string, SpecAnswer> = {};
    for (const v of item.specValues) {
      if (v.option) cells[v.field.key] = v.option.label;
      else if (v.valueItem) cells[v.field.key] = v.valueItem.aliasName || v.valueItem.name;
      else if (v.valueRefId) cells[v.field.key] = refLabels.get(v.valueRefId) ?? "";
      else if (v.valueNumber !== null) cells[v.field.key] = `${v.valueNumber}${v.field.unitSuffix ?? ""}`;
      else if (v.valueBool !== null) cells[v.field.key] = v.valueBool ? "Yes" : "No";
      else cells[v.field.key] = v.valueText ?? "";

      answers[v.field.key] = {
        valueText: v.valueText,
        valueNumber: v.valueNumber,
        valueBool: v.valueBool,
        optionId: v.optionId,
        valueItemId: v.valueItemId,
        valueRefId: v.valueRefId,
      };
    }
    return {
      id: item.id,
      name: item.name,
      itemCode: item.itemCode,
      aliasName: item.aliasName,
      status: item.status,
      // Purchased items have no recipe, so the grid gives them no BOM expander.
      producible: item.manufacturingType !== "BUY",
      // Stored as "1 secondary = factor primary", the way a storekeeper says it:
      // one roll is fifty metres.
      units: {
        primary: item.defaultUOM,
        secondary: item.secondaryUOM ?? null,
        factor:
          item.conversions.find(
            (c) => c.fromUOM === item.secondaryUOM && c.toUOM === item.defaultUOM
          )?.conversionFactor ?? null,
      },
      cells,
      answers,
    };
  });
}


/**
 * The contributions selected by one item's answers.
 *
 * A contribution hangs off a *value* — an option, a referenced record, or an
 * item — so choosing that value anywhere brings its components along. Entered
 * once on the design, applied to every vehicle that uses it.
 *
 * Exported so the wizard's pre-save preview resolves contributions the same way
 * the item page does, rather than with its own simpler copy that quietly dropped
 * every spec-driven line.
 */
export async function loadContributionsFor(
  factoryId: string,
  specValues: { optionId: string | null; valueRefId: string | null; valueItemId: string | null }[]
): Promise<BomContributionShape[]> {
  const optionIds = specValues.map((v) => v.optionId).filter((x): x is string => Boolean(x));
  const refIds = specValues.map((v) => v.valueRefId).filter((x): x is string => Boolean(x));
  const itemIds = specValues.map((v) => v.valueItemId).filter((x): x is string => Boolean(x));
  if (!optionIds.length && !refIds.length && !itemIds.length) return [];

  const rows = await prisma.bomContribution.findMany({
    where: {
      factoryId,
      OR: [
        ...(optionIds.length ? [{ optionId: { in: optionIds } }] : []),
        ...(refIds.length ? [{ refId: { in: refIds } }] : []),
        ...(itemIds.length ? [{ ownerItemId: { in: itemIds } }] : []),
      ],
    },
    include: {
      option: { select: { label: true } },
      ownerItem: { select: { name: true, aliasName: true } },
      sourceField: { select: { key: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  if (rows.length === 0) return [];

  const refLabels = await loadRefLabels(
    rows.map((r) => r.refId).filter((x): x is string => Boolean(x))
  );

  return Promise.all(
    rows.map(async (r) => {
      let qty = r.quantity;
      if (r.quantityFromFieldId && r.ownerItemId) {
        const val = await prisma.itemFieldValue.findFirst({
          where: { itemId: r.ownerItemId, fieldId: r.quantityFromFieldId },
          select: { valueNumber: true }
        });
        qty = val?.valueNumber ?? r.quantity;
      }
      return {
        itemId: r.componentItemId,
        sourceFieldKey: r.sourceField?.key ?? null,
        quantity: qty,
        quantityFrom: r.quantityFrom,
        wastePercent: r.wastePercent,
        sourceLabel:
          r.option?.label ??
          (r.refId ? refLabels.get(r.refId) ?? null : null) ??
          r.ownerItem?.aliasName ??
          r.ownerItem?.name ??
          "contribution",
      };
    })
  );
}

/** The recipe for an item. Empty for BUY items — they have no recipe. */
export async function getItemBom(itemId: string) {
  const user = await getOwnerUser();
  return getItemBomFor(user.factoryId, itemId);
}

/**
 * Same as getItemBom, with the factory passed in rather than read from the
 * session — so scripts and tests can expand a BOM without a request context.
 */
export async function getItemBomFor(factoryId: string, itemId: string) {
  const user = { factoryId };
  const item = await prisma.itemMaster.findFirst({
    where: { id: itemId, factoryId: user.factoryId },
    include: { specValues: { include: { field: true } } },
  });
  if (!item || item.manufacturingType === "BUY" || !item.groupId) return [];

  const [lines, group, overrides] = await Promise.all([
    prisma.bomTemplateLine.findMany({
      where: { groupId: item.groupId },
      include: {
        sourceField: { select: { key: true } },
        quantityFromField: { select: { key: true } },
        quantityViaField: { select: { id: true, key: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.itemGroup.findUnique({ where: { id: item.groupId }, select: { name: true } }),
    prisma.itemBomOverride.findMany({
      where: { itemId, factoryId: user.factoryId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const answers: Record<string, { valueItemId?: string | null }> = {};
  for (const v of item.specValues) answers[v.field.key] = { valueItemId: v.valueItemId };

  // Resolve dynamic quantities for template lines
  const resolvedLines = await Promise.all(
    lines.map(async (l) => {
      let qty = l.quantity;
      if (l.quantityFromFieldId) {
        if (!l.quantityViaFieldId) {
          const val = item.specValues.find((v) => v.fieldId === l.quantityFromFieldId);
          qty = val?.valueNumber ?? l.quantity;
        } else {
          const viaVal = item.specValues.find((v) => v.fieldId === l.quantityViaFieldId);
          const linkedItemId = viaVal?.valueItemId;
          if (linkedItemId) {
            const linkedVal = await prisma.itemFieldValue.findFirst({
              where: { itemId: linkedItemId, fieldId: l.quantityFromFieldId },
              select: { valueNumber: true },
            });
            qty = linkedVal?.valueNumber ?? l.quantity;
          }
        }
      }
      return {
        itemId: l.itemId,
        sourceFieldKey: l.sourceField?.key ?? null,
        quantity: qty,
        quantityFrom: l.quantityFrom,
        wastePercent: l.wastePercent,
      };
    })
  );

  const context: Record<string, number> = {};

  const contributions = await loadContributionsFor(user.factoryId, item.specValues);

  if (resolvedLines.length === 0 && contributions.length === 0 && overrides.length === 0) return [];

  const expanded = resolveItemBom({
    groupLines: resolvedLines,
    groupLabel: group?.name ? `${group.name} recipe` : "category recipe",
    contributions,
    overrides: overrides.map((o) => ({
      componentItemId: o.componentItemId,
      removed: o.removed,
      quantity: o.quantity,
      wastePercent: o.wastePercent,
    })),
    answers,
    context,
  });

  const components = await prisma.itemMaster.findMany({
    where: { id: { in: expanded.map((e) => e.itemId) } },
    select: { id: true, name: true, itemCode: true, defaultUOM: true },
  });
  const byId = new Map(components.map((c) => [c.id, c]));
  return expanded.map((e) => ({ ...e, component: byId.get(e.itemId) ?? null }));
}

/** Everything this item is a component of — including consumables. */
export async function getItemUsedIn(itemId: string) {
  const user = await getOwnerUser();
  const values = await prisma.itemFieldValue.findMany({
    where: { factoryId: user.factoryId, valueItemId: itemId },
    include: { item: { select: { id: true, name: true, itemCode: true } } },
  });
  const seen = new Set<string>();
  return values
    .map((v) => v.item)
    .filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/** The `include` needed to build a spec summary for an item. */
// satisfies for the same reason as the includes in jobCardAdapter.
export const SPEC_SUMMARY_INCLUDE = {
  field: { select: { name: true, unitSuffix: true, sortOrder: true } },
  option: { select: { label: true } },
  valueItem: { select: { name: true, aliasName: true } },
} as const satisfies Prisma.ItemFieldValueInclude;

type SummaryValue = {
  valueText: string | null;
  valueNumber: number | null;
  valueBool: boolean | null;
  valueRefId: string | null;
  field: { name: string; unitSuffix: string | null; sortOrder: number };
  option: { label: string } | null;
  valueItem: { name: string; aliasName: string | null } | null;
};

/**
 * A one-line spec summary — "Material Type: Leatherite · GSM: 220".
 *
 * Used wherever an item's name alone is not enough to know what it is: stock
 * tables, bin balances, purchase orders and vendor slips.
 */
export function specSummary(values: SummaryValue[], refLabels: Map<string, string>): string {
  return [...values]
    .sort((a, b) => a.field.sortOrder - b.field.sortOrder)
    .map((v) => {
      const value =
        v.option?.label ??
        (v.valueItem ? v.valueItem.aliasName || v.valueItem.name : null) ??
        (v.valueRefId ? refLabels.get(v.valueRefId) ?? null : null) ??
        (v.valueNumber !== null ? `${v.valueNumber}${v.field.unitSuffix ?? ""}` : null) ??
        (v.valueBool !== null ? (v.valueBool ? "Yes" : "No") : null) ??
        v.valueText;
      return value ? `${v.field.name}: ${value}` : null;
    })
    .filter(Boolean)
    .join(" · ");
}

/**
 * Every item stock can be recorded against, with its group and spec summary.
 *
 * One list across all item types, so inventory no longer has to ask the user
 * "material or product?" before it can offer a dropdown — the item's own type
 * decides how it is handled.
 */
export async function getStockableItems() {
  const user = await getOwnerUser();
  const items = await prisma.itemMaster.findMany({
    where: {
      factoryId: user.factoryId,
      status: { in: ["ACTIVE", "DRAFT"] },
      itemType: {
        in: ["RAW_MATERIAL", "SEMI_FINISHED", "FINISHED_PRODUCT", "CONSUMABLE", "PACKAGING", "SPARE_PART"],
      },
    },
    select: {
      id: true,
      name: true,
      aliasName: true,
      itemCode: true,
      itemType: true,
      defaultUOM: true,
      group: { select: { name: true } },
    },
    orderBy: [{ itemType: "asc" }, { name: "asc" }],
  });

  return items.map((i) => ({
    id: i.id,
    name: i.name,
    itemCode: i.itemCode,
    itemType: i.itemType,
    uom: i.defaultUOM,
    groupName: i.group?.name ?? null,
    searchText: [i.name, i.aliasName, i.itemCode, i.group?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  }));
}

/**
 * Items a purchase order can be raised for.
 *
 * Bought categories by default, widened by any group the owner has explicitly
 * marked purchasable — so a factory that buys semi-finished panels can say so
 * without a code change.
 */
export async function getPurchasableItems() {
  const user = await getOwnerUser();
  const items = await prisma.itemMaster.findMany({
    where: {
      factoryId: user.factoryId,
      status: { in: ["ACTIVE", "DRAFT"] },
      // Attribute categories (Vehicles, Brands, Models, Generations, Designs,
      // Colours) are RAW_MATERIAL-typed but are metadata, not things a supplier
      // can ship — the purchase-order picker was offering "Alto K10" and
      // "2010-2020" as buyable materials.
      group: { hasInventoryUnits: true },
      OR: [
        { itemType: { in: ["RAW_MATERIAL", "CONSUMABLE", "PACKAGING", "SPARE_PART"] } },
        { group: { isPurchasable: true } },
      ],
    },
    select: {
      id: true,
      name: true,
      aliasName: true,
      itemCode: true,
      itemType: true,
      defaultUOM: true,
      hsnCode: true,
      group: { select: { name: true } },
      specValues: {
        include: {
          field: { select: { name: true, unitSuffix: true, sortOrder: true } },
          option: { select: { label: true } },
          valueItem: { select: { name: true, aliasName: true } },
        },
      },
    },
    orderBy: [{ itemType: "asc" }, { name: "asc" }],
  });

  const refIds = items.flatMap((i) =>
    i.specValues.map((v) => v.valueRefId).filter((x): x is string => Boolean(x))
  );
  const refLabels = await loadRefLabels(refIds);

  return items.map((i) => {
    const spec = specSummary(i.specValues, refLabels);

    return {
      id: i.id,
      name: i.name,
      itemCode: i.itemCode,
      itemType: i.itemType,
      uom: i.defaultUOM,
      hsnCode: i.hsnCode,
      groupName: i.group?.name ?? null,
      spec,
      searchText: [i.name, i.aliasName, i.itemCode, i.group?.name, spec]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });
}

/**
 * Values already used for a field, most common first.
 *
 * Turns every input into a picker over what the factory has actually typed
 * before — "Lead Time Days" offers 7, 14, 30 because other suppliers use them —
 * while still accepting anything new. Suggestions, not a closed list.
 */
export async function getFieldValueSuggestions(fieldId: string): Promise<string[]> {
  const user = await getOwnerUser();
  const rows = await prisma.itemFieldValue.findMany({
    where: {
      factoryId: user.factoryId,
      fieldId,
      OR: [{ valueText: { not: null } }, { valueNumber: { not: null } }],
    },
    select: { valueText: true, valueNumber: true },
    take: 500,
  });

  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = r.valueText ?? (r.valueNumber !== null ? String(r.valueNumber) : "");
    const trimmed = v.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 50)
    .map(([value]) => value);
}

/**
 * What a not-yet-created SKU would inherit, given the answers picked so far.
 *
 * Read-only, for the wizard: the components brought along by the chosen spec
 * values (the fabric's leather, the design's thread) plus the category's own
 * recipe lines, merged and summed exactly the way the real BOM is — so the
 * preview cannot promise something the item will not get.
 *
 * Resolution goes through resolveItemBom, the same function getItemBomFor uses
 * once the item is real. The preview used to read `itemId` off template lines
 * and filter out the rest, which silently dropped every spec-driven line — the
 * "[fabric slot]" recipe that is the whole point of a dynamic BOM showed up as
 * nothing inherited.
 */
export async function previewInheritedBomFor(
  factoryId: string,
  groupId: string,
  answers: Record<string, SpecAnswer>
): Promise<{ itemId: string; name: string; quantity: number; uom: string; source: string }[]> {
  const [group, lines, contributions] = await Promise.all([
    prisma.itemGroup.findFirst({ where: { id: groupId, factoryId }, select: { name: true } }),
    prisma.bomTemplateLine.findMany({
      where: { groupId, factoryId },
      include: {
        sourceField: { select: { key: true } },
        quantityFromField: { select: { key: true } },
        quantityViaField: { select: { key: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    loadContributionsFor(
      factoryId,
      Object.values(answers).map((a) => ({
        optionId: a?.optionId ?? null,
        valueRefId: a?.valueRefId ?? null,
        valueItemId: a?.valueItemId ?? null,
      }))
    ),
  ]);

  // Dynamic quantities read off the answers rather than off stored values: the
  // item does not exist yet, so "fabric consumption" comes from the design
  // picked in the form a moment ago.
  const groupLines = await Promise.all(
    lines.map(async (l) => {
      let quantity = l.quantity;
      const fromFieldId = l.quantityFromFieldId;
      if (fromFieldId && l.quantityFromField) {
        if (!l.quantityViaField) {
          quantity = answers[l.quantityFromField.key]?.valueNumber ?? l.quantity;
        } else {
          const linkedItemId = answers[l.quantityViaField.key]?.valueItemId;
          if (linkedItemId) {
            const linked = await prisma.itemFieldValue.findFirst({
              where: { itemId: linkedItemId, fieldId: fromFieldId },
              select: { valueNumber: true },
            });
            quantity = linked?.valueNumber ?? l.quantity;
          }
        }
      }
      return {
        itemId: l.itemId,
        sourceFieldKey: l.sourceField?.key ?? null,
        quantity,
        quantityFrom: l.quantityFrom,
        wastePercent: l.wastePercent,
      };
    })
  );

  if (groupLines.length === 0 && contributions.length === 0) return [];

  const expanded = resolveItemBom({
    groupLines,
    groupLabel: group?.name ? `${group.name} recipe` : "category recipe",
    contributions,
    // Nothing to override: the item has no id yet, so the wizard's own edits are
    // held in the modal and written once creation mints one.
    overrides: [],
    answers,
    context: {},
  });
  if (expanded.length === 0) return [];

  const components = await prisma.itemMaster.findMany({
    where: { id: { in: expanded.map((e) => e.itemId) } },
    select: { id: true, name: true, defaultUOM: true },
  });
  const byId = new Map(components.map((c) => [c.id, c]));

  return expanded
    .map((e) => ({
      itemId: e.itemId,
      name: byId.get(e.itemId)?.name ?? e.itemId,
      quantity: e.quantity,
      uom: byId.get(e.itemId)?.defaultUOM ?? "",
      source: e.sourceLabel,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
