/**
 * Presentation labels derived from code-level identifiers.
 *
 * No "server-only" guard: every function here is pure string/number
 * transformation with no database or secret access, and the checkbox matrix
 * and configuration editor — both client components — need the same
 * humanization the server-rendered pages use, so the labels never disagree.
 *
 * Verity's entity and configuration keys are dot-namespaced strings by design
 * (MET-ENT-004, PLA-EXT-001) — a new capability introduces entities without
 * touching the platform ontology. Deriving a label from the key at read time
 * keeps that freedom: an unfamiliar key still gets a plain, readable default
 * instead of a raw string, and nothing here needs to change for a capability
 * that did not exist when this file was written.
 */

export function humanizeSegment(segment: string): string {
  return segment
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** `verity.asset.asset` -> `Asset`. Last dot segment, humanized. */
export function entityLabel(entityKey: string): string {
  const parts = entityKey.split(".");
  const last = parts[parts.length - 1] ?? entityKey;
  return humanizeSegment(last);
}

export type ConfigKeyInfo = {
  /** Second dot segment — the owning capability's slug, e.g. `plywood`. */
  groupSlug: string;
  fieldLabel: string;
  /** True for a trailing `_bp` (basis points) segment — render as a percent. */
  isBasisPoints: boolean;
};

/**
 * `verity.plywood.tax.cgst_rate_bp` -> { groupSlug: "plywood", fieldLabel:
 * "Tax Cgst Rate (%)", isBasisPoints: true }.
 *
 * Basis points is the one convention worth special-casing generically: any
 * future `*_bp` key benefits without a per-key entry, because the transform is
 * a suffix rule, not a lookup table.
 */
export function configKeyInfo(key: string): ConfigKeyInfo {
  const parts = key.split(".");
  const groupSlug = parts[1] ?? "platform";
  const rest = parts.slice(2);

  const lastRaw = rest[rest.length - 1] ?? key;
  const isBasisPoints = lastRaw.endsWith("_bp");
  const last = isBasisPoints ? lastRaw.slice(0, -"_bp".length) : lastRaw;
  const labelParts = [...rest.slice(0, -1), last];

  const fieldLabel =
    humanizeSegment(labelParts.join(" ")) + (isBasisPoints ? " (%)" : "");

  return { groupSlug, fieldLabel, isBasisPoints };
}

/** Basis points (900) <-> a percent value as typed/displayed (9 or 9.00). */
export function basisPointsToPercent(value: number): number {
  return Math.round((value / 100) * 100) / 100;
}

export function percentToBasisPoints(value: number): number {
  return Math.round(value * 100);
}
