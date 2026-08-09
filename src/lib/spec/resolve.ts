import type { ResolvedValue, ResolvedAnswers } from "./types";

type GroupNode = { id: string; parentId: string | null };

type FieldLike = {
  id: string;
  groupId: string;
  key: string;
  sortOrder: number;
  archivedAt: Date | null;
};

/**
 * Ancestry for a group, root first, including the group itself.
 * Returns [] if the group is unknown. The walk is capped at the number of known
 * groups so a cycle terminates rather than hanging.
 */
export function groupChain<T extends GroupNode>(groups: T[], groupId: string): T[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const chain: T[] = [];
  let current = byId.get(groupId);
  let guard = groups.length + 1;
  while (current && guard-- > 0) {
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

/**
 * Fields visible on the last group in `chain`: ancestors first, with a
 * descendant's field replacing an ancestor's when they share a key.
 * Archived fields are dropped.
 */
export function mergeInheritedFields<T extends FieldLike>(chain: string[], fields: T[]): T[] {
  const depth = new Map(chain.map((id, i) => [id, i]));
  const byKey = new Map<string, T>();

  for (const field of fields) {
    if (field.archivedAt) continue;
    const fieldDepth = depth.get(field.groupId);
    if (fieldDepth === undefined) continue;

    const existing = byKey.get(field.key);
    if (!existing || depth.get(existing.groupId)! <= fieldDepth) {
      byKey.set(field.key, field);
    }
  }

  return [...byKey.values()].sort((a, b) => {
    const byDepth = depth.get(a.groupId)! - depth.get(b.groupId)!;
    return byDepth !== 0 ? byDepth : a.sortOrder - b.sortOrder;
  });
}

/**
 * The column on a target category that links its rows back to a parent category.
 *
 * This is what makes "choose a brand, then only its models are offered" work
 * once vehicles are ordinary categories: a Model row carries a Brand link, and
 * narrowing means matching that link against the brand already chosen.
 *
 * Inferred rather than configured — the one field pointing at the parent
 * category is almost always the intended one, and asking the owner to nominate
 * it would be a question with a single sensible answer. Ambiguity is resolved by
 * refusing rather than guessing: two links to the same category means the
 * narrowing is genuinely undecidable, and silently picking one would filter the
 * list by something the owner never chose.
 */
export function findLinkColumn<
  T extends { id: string; kind: string; targetGroupId: string | null }
>(targetFields: T[], parentGroupId: string): T | null {
  const candidates = targetFields.filter(
    (f) => f.kind === "REFERENCE" && f.targetGroupId === parentGroupId
  );
  return candidates.length === 1 ? candidates[0] : null;
}

/** A group and every group beneath it. Used by includeDescendants. */
export function descendantIds<T extends GroupNode>(groups: T[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const g of groups) {
    if (!g.parentId) continue;
    const list = childrenOf.get(g.parentId) ?? [];
    list.push(g.id);
    childrenOf.set(g.parentId, list);
  }
  const out: string[] = [];
  const queue = [rootId];
  let guard = groups.length + 1;
  while (queue.length && guard-- > 0) {
    const id = queue.shift()!;
    out.push(id);
    queue.push(...(childrenOf.get(id) ?? []));
  }
  return out;
}

type FieldShape = {
  kind: "VALUE" | "OPTION" | "REFERENCE";
  valueType: string | null;
  unitSuffix: string | null;
};

export type RawAnswer = {
  valueText?: string | null;
  valueNumber?: number | null;
  valueBool?: boolean | null;
  option?: { label: string; shortCode: string | null } | null;
  valueItem?: { name: string; aliasName: string | null; itemCode: string | null } | null;
  /** Attribute-master reference, pre-loaded by the caller. */
  refLabel?: string | null;
  refCode?: string | null;
};

/**
 * Collapse one stored answer into the pair of strings the templates print.
 *
 * The alias-over-name rule lives here: a fabric named "Leatherite Beige 220 GSM"
 * with alias "Beige" contributes "Beige" to a parent item's name, which is what
 * keeps generated names short without a token-path syntax.
 */
export function resolveAnswer(field: FieldShape, raw: RawAnswer): ResolvedValue | null {
  if (field.kind === "OPTION") {
    if (!raw.option) return null;
    return { name: raw.option.label, code: raw.option.shortCode || raw.option.label };
  }

  if (field.kind === "REFERENCE") {
    if (raw.valueItem) {
      const name = raw.valueItem.aliasName || raw.valueItem.name;
      return { name, code: raw.valueItem.itemCode || name };
    }
    if (raw.refLabel) {
      return { name: raw.refLabel, code: raw.refCode || raw.refLabel };
    }
    // A reference pointed at one column of the target rather than at its
    // records answers with that column's own value — an option when the column
    // offers a list, plain text when it does not.
    if (raw.option) {
      return { name: raw.option.label, code: raw.option.shortCode || raw.option.label };
    }
    if (raw.valueText) {
      return { name: raw.valueText, code: raw.valueText };
    }
    return null;
  }

  // Explicit null/undefined checks rather than truthiness, so 0 and false count
  // as answered.
  if (raw.valueNumber !== undefined && raw.valueNumber !== null) {
    const base = String(raw.valueNumber);
    return { name: base + (field.unitSuffix ?? ""), code: base };
  }
  if (raw.valueBool !== undefined && raw.valueBool !== null) {
    const base = raw.valueBool ? "Yes" : "No";
    return { name: base, code: base };
  }
  if (raw.valueText) {
    return { name: raw.valueText, code: raw.valueText };
  }
  return null;
}

/** Resolve a whole answer set, keyed by each field's template token. */
export function resolveAnswers(
  fields: (FieldShape & { key: string })[],
  raws: Record<string, RawAnswer>
): ResolvedAnswers {
  const out: ResolvedAnswers = {};
  for (const field of fields) {
    const resolved = resolveAnswer(field, raws[field.key] ?? {});
    if (resolved) out[field.key] = resolved;
  }
  return out;
}
