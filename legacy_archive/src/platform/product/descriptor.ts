/**
 * Generic product descriptor engine.
 *
 * A descriptor is the full human identity of a thing a tenant makes or sells:
 *
 *   "Honda City 2015-2018 Seat Cover DB 5HDR Arm Shaka Spcl Archer"
 *   "Oak Dining Table 6-Seater Matte Walnut"
 *   "Quarterly Compliance Audit — Retail — Tier 2"
 *
 * The previous implementation (src/lib/variant-descriptor.ts) hardcoded the
 * automotive field list and their ordering, so no other industry could produce
 * a descriptor at all. Here the field set, the label ordering and the search
 * weights all come from the ProductType definition.
 *
 * This module is deliberately pure and dependency-free: no Prisma, no server
 * imports. It is the piece every vertical runs through, so it must be trivially
 * testable and usable on both client and server.
 */

export type FieldValue = string | number | boolean | null | undefined;
export type DescriptorValues = Record<string, FieldValue>;

export interface FieldSpec {
  /** Machine key; matches ProductField.key and the dynamicData key. */
  key: string;
  label: string;
  /**
   * How identifying this field is when searching, 0-100. Typing "swift" must
   * surface the Swift *model* above a product whose design merely contains
   * "swift", so model outranks design. A flat whole-string score cannot tell
   * those apart and buries the real hit.
   */
  weight: number;
  /** Whether the field participates in the rendered label. */
  includeInLabel?: boolean;
  /**
   * Renders the stored value into its label form: 5 -> "5HDR", true -> "Arm".
   * Booleans with no formatter contribute their label when true and nothing
   * when false, which is almost always what reads correctly.
   */
  format?: (value: FieldValue) => string;
}

export interface DescriptorSpec {
  /**
   * Ordering template over field keys, e.g.
   *   "{brand} {model} {generation} {product} {seat_type} {headrests}"
   * Unknown or empty placeholders collapse, so a partially filled descriptor
   * renders cleanly rather than leaving gaps.
   */
  labelTemplate: string;
  fields: FieldSpec[];
}

const PLACEHOLDER = /\{([a-zA-Z0-9_]+)\}/g;

function renderField(spec: FieldSpec | undefined, value: FieldValue): string {
  if (spec?.format) return spec.format(value) ?? "";
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? (spec?.label ?? "") : "";
  const s = String(value).trim();
  return s;
}

/**
 * The canonical one-line rendering. Ordering is fixed by the template so the
 * string is stable and comparable, even though searching it is order-independent.
 */
export function formatDescriptor(spec: DescriptorSpec, values: DescriptorValues): string {
  const byKey = new Map(spec.fields.map((f) => [f.key, f]));
  const parts: string[] = [];

  for (const match of spec.labelTemplate.matchAll(PLACEHOLDER)) {
    const key = match[1];
    const field = byKey.get(key);
    if (field && field.includeInLabel === false) continue;
    const rendered = renderField(field, values[key]);
    if (rendered) parts.push(rendered);
  }

  return parts.join(" ");
}

/** Every token must appear somewhere, in any order — a set of constraints. */
export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,/;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return true;
  const hay = haystack.toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

/**
 * Score a descriptor against tokens, weighted per field.
 *
 * Returns -1 when any token matches no field at all, which removes the row
 * entirely — a query is a conjunction, not a suggestion.
 */
export function scoreDescriptor(
  spec: DescriptorSpec,
  values: DescriptorValues,
  tokens: string[],
): number {
  if (tokens.length === 0) return 0;

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const field of spec.fields) {
      const fieldValue = renderField(field, values[field.key]).toLowerCase();
      if (!fieldValue) continue;

      const words = fieldValue.split(/\s+/);
      let quality = 0;
      if (words.some((w) => w === token)) quality = 3;
      else if (words.some((w) => w.startsWith(token))) quality = 2;
      else if (fieldValue.includes(token)) quality = 1;

      if (quality > 0) best = Math.max(best, field.weight * quality);
    }
    if (best === 0) return -1;
    total += best;
  }

  // Shorter labels win ties — the more general match.
  return total * 1000 - formatDescriptor(spec, values).length;
}

/**
 * Whether a field should be shown, given a `visibleWhen` rule and the current
 * values. Generalises the hardcoded rule that only seat products carry bench
 * and headrest geometry.
 *
 * Supported shapes:
 *   { field: "product", matches: "seat" }   case-insensitive substring
 *   { field: "product", equals: "Table" }
 *   { field: "armrest", truthy: true }
 *   { all: [...] } / { any: [...] }
 */
export type VisibilityRule =
  | { field: string; matches: string }
  | { field: string; equals: FieldValue }
  | { field: string; truthy: boolean }
  | { all: VisibilityRule[] }
  | { any: VisibilityRule[] };

export function isFieldVisible(
  rule: VisibilityRule | null | undefined,
  values: DescriptorValues,
): boolean {
  if (!rule) return true;

  if ("all" in rule) return rule.all.every((r) => isFieldVisible(r, values));
  if ("any" in rule) return rule.any.some((r) => isFieldVisible(r, values));

  const raw = values[rule.field];

  if ("matches" in rule) {
    return String(raw ?? "").toLowerCase().includes(rule.matches.toLowerCase());
  }
  if ("equals" in rule) return raw === rule.equals;
  return Boolean(raw) === rule.truthy;
}
