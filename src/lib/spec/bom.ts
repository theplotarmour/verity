export type BomTemplateLineShape = {
  itemId: string | null;
  sourceFieldKey: string | null;
  quantity: number;
  quantityFrom: string | null;
  wastePercent: number;
};

export type BomLine = { itemId: string; quantity: number; wastePercent: number };

/**
 * Turn a group's BOM template into concrete lines for one item's answers.
 *
 * A line resolves its component from `itemId` or from the item answered in
 * `sourceFieldKey`. A line whose component or computed quantity cannot be
 * resolved is dropped rather than emitted with a wrong value — a missing line is
 * visible to the owner; a silently wrong quantity is not.
 */
export function expandBomTemplate(
  lines: BomTemplateLineShape[],
  answers: Record<string, { valueItemId?: string | null }>,
  context: Record<string, number>
): BomLine[] {
  const merged = new Map<string, BomLine>();

  for (const line of lines) {
    const itemId =
      line.itemId ??
      (line.sourceFieldKey ? answers[line.sourceFieldKey]?.valueItemId ?? null : null);
    if (!itemId) continue;

    let quantity = line.quantity;
    if (line.quantityFrom) {
      const fromContext = context[line.quantityFrom];
      if (fromContext === undefined) continue;
      quantity = fromContext;
    }

    const existing = merged.get(itemId);
    if (existing) existing.quantity += quantity;
    else merged.set(itemId, { itemId, quantity, wastePercent: line.wastePercent });
  }

  return [...merged.values()];
}

/** Which layer put a line in the BOM. Later layers beat earlier ones. */
export type BomSource = "group" | "contribution" | "override";

export type ResolvedBomLine = {
  itemId: string;
  quantity: number;
  wastePercent: number;
  source: BomSource;
  /**
   * Where the line came from, in the owner's words: "Seat Cover recipe",
   * "ERGO FIT Vertex". A surprising quantity should be traceable in one glance
   * rather than by archaeology.
   */
  sourceLabel: string;
};

/** A contribution, already filtered to the ones this item's answers select. */
export type BomContributionShape = BomTemplateLineShape & { sourceLabel: string };

/** One item's departure from what its recipe and contributions produce. */
export type BomOverrideShape = {
  componentItemId: string;
  removed: boolean;
  quantity: number;
  wastePercent: number;
};

/**
 * Compose one item's BOM from the three layers, in order of increasing
 * authority: the category recipe, the contributions its answers bring in, then
 * the item's own overrides.
 *
 * Two lines naming the same component sum, matching how a single template
 * already behaves and how BOMs work elsewhere: if the recipe calls for 20 m of
 * thread and the chosen design calls for 50 m, the item needs 70 m.
 *
 * An override does not sum. It is the owner saying what this SKU actually takes,
 * so it replaces the total outright — otherwise correcting a quantity downward
 * would be impossible.
 */
export function resolveItemBom(input: {
  groupLines: BomTemplateLineShape[];
  groupLabel: string;
  contributions: BomContributionShape[];
  overrides: BomOverrideShape[];
  answers: Record<string, { valueItemId?: string | null }>;
  context: Record<string, number>;
}): ResolvedBomLine[] {
  const merged = new Map<string, ResolvedBomLine>();

  const add = (line: BomLine, source: BomSource, label: string) => {
    const existing = merged.get(line.itemId);
    if (!existing) {
      merged.set(line.itemId, { ...line, source, sourceLabel: label });
      return;
    }
    existing.quantity += line.quantity;
    // Keep both origins visible; a merged line that names only one of its two
    // sources is the kind of half-truth that costs an hour to unpick.
    if (!existing.sourceLabel.includes(label)) {
      existing.sourceLabel = `${existing.sourceLabel} + ${label}`;
    }
    existing.source = source;
  };

  for (const line of expandBomTemplate(input.groupLines, input.answers, input.context)) {
    add(line, "group", input.groupLabel);
  }

  // Each contribution expands on its own so its label survives the merge.
  for (const contribution of input.contributions) {
    for (const line of expandBomTemplate([contribution], input.answers, input.context)) {
      add(line, "contribution", contribution.sourceLabel);
    }
  }

  for (const override of input.overrides) {
    if (override.removed) {
      merged.delete(override.componentItemId);
      continue;
    }
    const existing = merged.get(override.componentItemId);
    merged.set(override.componentItemId, {
      itemId: override.componentItemId,
      quantity: override.quantity,
      wastePercent: override.wastePercent,
      source: "override",
      sourceLabel: existing ? `overrides ${existing.sourceLabel}` : "added on this item",
    });
  }

  return [...merged.values()];
}
