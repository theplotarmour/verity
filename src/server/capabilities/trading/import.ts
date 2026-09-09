import { z } from "zod";
import { registerQuery, type QueryDefinition } from "@/server/platform/query";
import { ENTITY_CUSTOMER, ENTITY_SUPPLIER } from "./keys";
import { createCustomer, createSupplier } from "./orders";

/**
 * CSV import, generic-trading half — Task 87.
 *
 * Authority: `taskplans/87_import_export_migration_framework.md`. Shape:
 * `Import → map → validate → preview → commit → reconcile`, at the scale of
 * a whole file. This file is the "validate → preview" half for customers
 * and suppliers; "commit" reuses `createCustomer`/`createSupplier` directly
 * through `runCommandBatch` (Task 91) from the server action that calls
 * this, so a bad row never fails the whole import and there is exactly one
 * definition of what makes a valid customer or supplier — this file adds
 * none of its own.
 *
 * DELIBERATELY NOT A GENERIC ETL ENGINE (this taskplan's own non-goal).
 * Scoped to the two entity types trading already defines. Product import
 * lives in `plywood/index.ts` instead of here, because it needs
 * plywood's own `createProduct` and brand-by-name resolution — trading
 * has no plywood dependency to point the other way.
 *
 * "Map" is deliberately not a drag-and-drop column mapper: a CSV column is
 * expected to already be named after the target field (`displayName`,
 * `gstin`, …), case-insensitively. A client with a spreadsheet naming
 * things differently renames one header row once — cheaper than building
 * and maintaining a mapping UI for a one-time task.
 */

const MAX_ROWS = 2000;

const RAW_ROW = z.record(z.string(), z.string());
const PREVIEW_INPUT = z.object({ rows: z.array(RAW_ROW).min(1).max(MAX_ROWS) });

export type ImportPreviewResult<T> = {
  valid: Array<{ row: number; data: T }>;
  invalid: Array<{ row: number; raw: Record<string, string>; errors: string[] }>;
};

/**
 * Turns a raw CSV row (all-string values, headers matched case-insensitively
 * against `fields`, blank cells present as `""`) into the shape a command's
 * own zod schema expects — matched to the schema's own camelCase key
 * (`gstin` in the CSV header finds `gstin` in the schema regardless of the
 * header's case), blanks turned into `undefined` so an optional field stays
 * optional rather than failing on an empty string, and numeric fields
 * coerced from their CSV text.
 */
function normalizeRow(
  raw: Record<string, string>,
  fields: readonly string[],
  numericFields: readonly string[] = [],
): Record<string, unknown> {
  const byLowerKey = new Map(Object.entries(raw).map(([k, v]) => [k.trim().toLowerCase(), v]));
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const value = byLowerKey.get(field.toLowerCase());
    const trimmed = value?.trim();
    if (!trimmed) continue; // blank or absent cell -> field omitted, not an empty string
    out[field] = numericFields.includes(field) ? Number(trimmed) : trimmed;
  }
  return out;
}

/**
 * Builds a preview query for one entity kind, validating each row against
 * the SAME zod schema the real create command uses — never a second,
 * subtly different definition of what makes a valid row (Task 82's rule).
 */
function importPreviewQuery<T>(
  key: string,
  entity: string,
  schema: z.ZodType<T>,
  fields: readonly string[],
  numericFields: readonly string[] = [],
): QueryDefinition<{ rows: Record<string, string>[] }, ImportPreviewResult<T>> {
  return {
    key,
    entity,
    input: PREVIEW_INPUT,
    handler: async (_ctx, input) => {
      const valid: ImportPreviewResult<T>["valid"] = [];
      const invalid: ImportPreviewResult<T>["invalid"] = [];
      input.rows.forEach((raw, index) => {
        const candidate = normalizeRow(raw, fields, numericFields);
        const parsed = schema.safeParse(candidate);
        if (parsed.success) {
          valid.push({ row: index + 1, data: parsed.data });
        } else {
          invalid.push({
            row: index + 1,
            raw,
            errors: parsed.error.issues.map(
              (issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`,
            ),
          });
        }
      });
      return { valid, invalid };
    },
  };
}

export const previewCustomerImport = importPreviewQuery(
  "verity.trading.preview_customer_import",
  ENTITY_CUSTOMER,
  createCustomer.input,
  ["displayName", "gstin", "phone", "email", "stateCode", "creditLimitPaise"],
  ["creditLimitPaise"],
);

export const previewSupplierImport = importPreviewQuery(
  "verity.trading.preview_supplier_import",
  ENTITY_SUPPLIER,
  createSupplier.input,
  ["displayName", "gstin", "phone", "email", "stateCode"],
);

export function registerTradingImport(): void {
  registerQuery(previewCustomerImport);
  registerQuery(previewSupplierImport);
}
