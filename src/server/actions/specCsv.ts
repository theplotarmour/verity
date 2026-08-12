"use server";

import Papa from "papaparse";
import prisma from "@/lib/prisma";
import { getOwnerUser } from "@/lib/server/owner";
import { getResolvedFields, getReferenceOptions, loadRefLabels } from "@/server/queries/spec";
import { csvHeader, csvSampleRow, csvOptionSheet, parseCsvRow } from "@/lib/csv/schema";
import { createItemFromSpec } from "./itemsFromSpec";
import type { SpecAnswer } from "@/lib/spec/types";

/** Current rows of a group, with references resolved to names rather than ids. */
export async function exportGroupCsv(groupId: string) {
  const user = await getOwnerUser();
  const fields = await getResolvedFields(groupId);
  const items = await prisma.itemMaster.findMany({
    where: { factoryId: user.factoryId, groupId },
    include: { specValues: { include: { option: true, valueItem: true } } },
    orderBy: { name: "asc" },
  });

  const refIds = items.flatMap((i) =>
    i.specValues.map((v) => v.valueRefId).filter((x): x is string => Boolean(x))
  );
  const refLabels = await loadRefLabels(refIds);

  const rows = items.map((item) => {
    const byField = new Map(item.specValues.map((v) => [v.fieldId, v]));
    return [
      item.aliasName ?? "",
      item.defaultUOM,
      ...fields.map((f) => {
        const v = byField.get(f.id);
        if (!v) return "";
        if (v.option) return v.option.label;
        if (v.valueItem) return v.valueItem.aliasName || v.valueItem.name;
        if (v.valueRefId) return refLabels.get(v.valueRefId) ?? "";
        if (v.valueNumber !== null) return String(v.valueNumber);
        if (v.valueBool !== null) return v.valueBool ? "Yes" : "No";
        return v.valueText ?? "";
      }),
    ];
  });

  return Papa.unparse([csvHeader(fields as never), ...rows]);
}

/**
 * A blank template: header, one filled sample row, and a block listing every
 * valid value for each dropdown column. Generated from the group's fields, so
 * it is never out of date with the sheet.
 */
export async function templateGroupCsv(groupId: string) {
  await getOwnerUser();
  const fields = await getResolvedFields(groupId);
  const main = Papa.unparse([csvHeader(fields as never), csvSampleRow(fields as never)]);
  const options = csvOptionSheet(fields as never);
  if (options.length === 0) return main;
  // A single CSV cannot carry two sheets, so valid values follow as a block.
  return `${main}\n\n# Valid values\nField,Value\n${Papa.unparse(options)}`;
}

export type ImportIssue = { row: number; column: string; message: string };
export type ImportResult = {
  created: number;
  issues: ImportIssue[];
  /**
   * Dropdown options this import added, as "Colour: Cherry Red".
   *
   * Surfaced rather than silent: extending an option list is a real change to the
   * shape of the category, and an owner importing a supplier's file should be
   * told their Colour column gained six values — otherwise a typo becomes a
   * permanent option nobody notices until it appears in a dropdown.
   */
  addedOptions?: string[];
};

/**
 * Find or create an option on a field, deduplicated across one import.
 *
 * Matches the convention in `fieldEntries.ts`: `value` mirrors `label`,
 * `shortCode` stays null rather than being invented, and `sortOrder` continues
 * the existing list. A generated short code would collide with the hand-picked
 * ones the code templates depend on.
 */
async function ensureOption(
  fieldId: string,
  raw: string,
  cache: Map<string, string>,
): Promise<string | null> {
  const label = raw.trim();
  if (!label) return null;

  const cacheKey = `${fieldId}::${label.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Someone may have added it since the fields were resolved, and `value` is
  // unique per field — so look before writing.
  const existing = await prisma.specFieldOption.findFirst({
    where: { fieldId, value: { equals: label, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    cache.set(cacheKey, existing.id);
    return existing.id;
  }

  try {
    const count = await prisma.specFieldOption.count({ where: { fieldId } });
    const option = await prisma.specFieldOption.create({
      data: { fieldId, value: label, label, sortOrder: count },
    });
    cache.set(cacheKey, option.id);
    return option.id;
  } catch {
    // Lost a race on the unique constraint. Re-read rather than fail the row.
    const winner = await prisma.specFieldOption.findFirst({
      where: { fieldId, value: { equals: label, mode: "insensitive" } },
      select: { id: true },
    });
    if (winner) cache.set(cacheKey, winner.id);
    return winner?.id ?? null;
  }
}

/**
 * Import rows into a group.
 *
 * Runs as a dry run unless `commit` is true, so the owner always sees the
 * issues before anything is written. References resolve by the same labels the
 * dropdowns show.
 */
export async function importGroupCsv(
  groupId: string,
  csv: string,
  commit: boolean
): Promise<ImportResult> {
  await getOwnerUser();
  const fields = await getResolvedFields(groupId);
  // The alias column can be renamed per group, so a hand-made file may use the
  // visible header rather than the literal "Alias" the export writes.
  const group = await prisma.itemGroup.findUnique({
    where: { id: groupId },
    select: { aliasLabel: true },
  });
  const aliasLabel = group?.aliasLabel?.trim() || "Alias";
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  // Resolve every reference field's options once, keyed by lowercased label.
  const refLookup = new Map<string, Map<string, string>>();
  for (const field of fields) {
    if (field.kind !== "REFERENCE") continue;
    const opts = await getReferenceOptions(field.id);
    refLookup.set(field.key, new Map(opts.map((o) => [o.label.toLowerCase(), o.id])));
  }

  const issues: ImportIssue[] = [];
  let created = 0;

  /**
   * Options this import added, so the same value appearing on forty rows creates
   * one option rather than forty attempts. Keyed `fieldId::lowercased value`,
   * because that is the uniqueness the database enforces.
   */
  const createdOptions = new Map<string, string>();
  /** Reported back, so the summary says what the import changed and not only what it wrote. */
  const addedOptions: string[] = [];

  for (const [index, record] of parsed.data.entries()) {
    const rowNo = index + 2; // header is row 1
    const { aliasName, unit, values } = parseCsvRow(fields as never, record, aliasLabel);
    const answers: Record<string, SpecAnswer> = {};
    let rowFailed = false;

    for (const field of fields) {
      const raw = values[field.key];
      if (!raw) {
        if (field.isRequired) {
          issues.push({ row: rowNo, column: field.name, message: "Required value is empty" });
          rowFailed = true;
        }
        continue;
      }

      if (field.kind === "OPTION") {
        const option = field.options.find((o) => o.label.toLowerCase() === raw.toLowerCase());
        if (option) {
          answers[field.key] = { optionId: option.id };
        } else {
          /*
           * A value the dropdown does not have yet.
           *
           * Refusing the row meant importing 400 seat covers failed because one
           * of them was a colour nobody had typed into the options list — and the
           * fix was to leave the importer, add the option by hand, and start
           * again. An option list is metadata *about* a column, not a controlled
           * vocabulary somebody signed off, so a CSV is a perfectly good way to
           * extend it.
           *
           * Only on commit. A dry run must not write anything: the owner is
           * asking "what would happen", and answering by mutating their schema
           * would make the preview a lie.
           */
          const newOption = commit ? await ensureOption(field.id, raw, createdOptions) : null;
          if (newOption) {
            answers[field.key] = { optionId: newOption };
            addedOptions.push(`${field.name}: ${raw.trim()}`);
          } else if (commit) {
            issues.push({
              row: rowNo,
              column: field.name,
              message: `Could not add "${raw}" to the options for ${field.name}`,
            });
            rowFailed = true;
          } else {
            // Dry run. Report it as an addition rather than an error, so the
            // preview says what the import will do instead of what it refuses.
            addedOptions.push(`${field.name}: ${raw.trim()}`);
          }
        }
      } else if (field.kind === "REFERENCE") {
        const id = refLookup.get(field.key)?.get(raw.toLowerCase());
        if (!id) {
          issues.push({ row: rowNo, column: field.name, message: `"${raw}" not found` });
          rowFailed = true;
        } else {
          answers[field.key] =
            field.refTarget === "ITEM_GROUP" ? { valueItemId: id } : { valueRefId: id };
        }
      } else if (field.valueType === "NUMBER" || field.valueType === "MEASUREMENT") {
        const n = Number(raw);
        if (Number.isNaN(n)) {
          issues.push({ row: rowNo, column: field.name, message: `"${raw}" is not a number` });
          rowFailed = true;
        } else {
          answers[field.key] = { valueNumber: n };
        }
      } else if (field.valueType === "TOGGLE" || field.valueType === "CHECKBOX") {
        answers[field.key] = { valueBool: /^(yes|true|y|1)$/i.test(raw) };
      } else {
        answers[field.key] = { valueText: raw };
      }
    }

    if (rowFailed) continue;

    if (commit) {
      const result = await createItemFromSpec({
        groupId,
        answers,
        defaultUOM: unit,
        aliasName,
      });
      if ("error" in result) issues.push({ row: rowNo, column: "—", message: result.error });
      else created++;
    } else {
      created++;
    }
  }

  // Deduplicated: the same value on forty rows is one addition, not forty.
  return { created, issues, addedOptions: [...new Set(addedOptions)] };
}
