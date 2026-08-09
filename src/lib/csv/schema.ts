type CsvField = {
  key: string;
  name: string;
  kind: "VALUE" | "OPTION" | "REFERENCE";
  options: { id: string; label: string; shortCode: string | null }[];
};

const FIXED = ["Alias", "Unit"];

/** Header row: fixed columns, then one per spec field, in field order. */
export function csvHeader(fields: CsvField[]): string[] {
  return [...FIXED, ...fields.map((f) => f.name)];
}

/** One filled example row so the owner can see the expected shape. */
export function csvSampleRow(fields: CsvField[]): string[] {
  return [
    "Short name",
    "PCS",
    ...fields.map((f) => {
      if (f.kind === "OPTION") return f.options[0]?.label ?? "";
      if (f.kind === "REFERENCE") return "Existing name or alias";
      return "";
    }),
  ];
}

/**
 * Second block of the template: every valid value for each option field, so the
 * owner never has to guess what an import will accept.
 */
export function csvOptionSheet(fields: CsvField[]): string[][] {
  const rows: string[][] = [];
  for (const field of fields) {
    if (field.kind !== "OPTION") continue;
    for (const option of field.options) rows.push([field.name, option.label]);
  }
  return rows;
}

/**
 * Turn one parsed CSV record back into field keys.
 *
 * `aliasLabel` is the group's own header for the alias column, which the owner
 * can rename. Both it and the literal "Alias" are accepted: the export header
 * stays "Alias" so a file downloaded before the rename still imports, and a
 * hand-made file using the visible header works too.
 */
export function parseCsvRow(
  fields: CsvField[],
  row: Record<string, string>,
  aliasLabel = "Alias"
) {
  const values: Record<string, string> = {};
  for (const field of fields) values[field.key] = (row[field.name] ?? "").trim();
  return {
    aliasName: (row.Alias ?? row[aliasLabel] ?? "").trim(),
    unit: (row.Unit ?? "").trim() || "PCS",
    values,
  };
}
