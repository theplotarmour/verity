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
 * `verity.trading.tax.cgst_rate_bp` -> { groupSlug: "trading", fieldLabel:
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

/**
 * Business-language labels for the `ActionExecute` verb — the one verb the
 * checkbox matrix's View/Manage/Delete columns cannot express, because it
 * gates commands like "issue these goods" or "approve this sales
 * order's credit hold" rather than a CRUD operation.
 *
 * `authorize()` checks the exact (verb, entity) pair — a role either holds
 * `ActionExecute` on an entity or it does not, with no finer grain (Bible
 * PLA-AUT-003: verbs are closed, entity is the only axis). Several distinct
 * commands often share one entity's `ActionExecute` grant (e.g. an order's
 * covers assign-carrier, dispatch, confirm-delivery AND report-lost), so a
 * label here is necessarily a composite of everything that one checkbox
 * actually unlocks — never a single command's name standing in for the whole
 * grant, which would misrepresent what got turned on.
 *
 * A curated map, not a generic derivation: unlike `entityLabel()`, a business
 * action can't be algorithmically guessed from a dot-namespaced key. An entity
 * missing from this map simply gets no Action column cell — a made-up verb
 * for a command that may not even exist would be worse than an empty cell.
 */
const ACTION_EXECUTE_LABELS: Record<string, string> = {
  // ADR-018 renamed these entities verity.plywood.* -> verity.trading.*;
  // Permission rows are migrated forward (unlike audit history, a grant is
  // current state, not a fact about the past), so only the new key is listed.
  "verity.trading.customer": "Set customer credit limits",
  "verity.trading.purchase_order": "Submit, receive goods & cancel purchase orders",
  "verity.trading.sales_order": "Approve credit, dispatch & cancel sales orders",
  "verity.trading.stock_ledger": "Adjust, write off & return stock",
  "verity.approval.request": "Decide pending approvals",
  "verity.dinein.menu_item": "Retire or restore menu items",
  "verity.dinein.table": "Move tables on the floor plan",
  "verity.dinein.order": "Send orders to the kitchen & cancel orders",
  "verity.dinein.order_line": "Advance or void order lines",
  "verity.dinein.bill": "Apply discounts & settle bills",
};

export function actionExecuteLabel(entityKey: string): string | null {
  return ACTION_EXECUTE_LABELS[entityKey] ?? null;
}

/** Basis points (900) <-> a percent value as typed/displayed (9 or 9.00). */
export function basisPointsToPercent(value: number): number {
  return Math.round((value / 100) * 100) / 100;
}

export function percentToBasisPoints(value: number): number {
  return Math.round(value * 100);
}
