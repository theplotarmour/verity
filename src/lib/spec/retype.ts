/**
 * What changing a column's type does to answers already given for it.
 *
 * ItemFieldValue keeps one column per type, so a retype cannot simply move the
 * data across — each conversion either survives, is rewritten, or is dropped.
 * This is pure so the caller can run it twice: once to show the owner what he
 * is about to lose, and again to apply it.
 */
export type StoredAnswer = {
  valueText: string | null;
  valueNumber: number | null;
  valueBool: boolean | null;
  /** Resolved by the caller from the option relation. */
  optionLabel: string | null;
};

export type AnswerPlan = {
  action: "keep" | "coerce" | "clear";
  /** Present only when the action is "coerce". */
  next?: StoredAnswer;
};

const EMPTY: StoredAnswer = {
  valueText: null,
  valueNumber: null,
  valueBool: null,
  optionLabel: null,
};

/**
 * Types stored in `valueText`. Moving between any two of them is a no-op at the
 * storage level, so the answer survives untouched — a date column handed
 * free text shows something wrong rather than nothing, which is the recoverable
 * failure of the two.
 */
const TEXT_BACKED = new Set(["TEXT", "TEXTAREA", "DATE", "COLOR", "IMAGE", "FILE"]);
const NUMERIC = new Set(["NUMBER", "MEASUREMENT"]);
/** Nothing converts into these — they need a chosen id, not a value. */
const NEEDS_A_CHOICE = new Set(["OPTION", "REFERENCE", "TOGGLE"]);

const isBlank = (a: StoredAnswer) =>
  a.valueText === null &&
  a.valueNumber === null &&
  a.valueBool === null &&
  a.optionLabel === null;

export function planAnswer(fromId: string, toId: string, answer: StoredAnswer): AnswerPlan {
  // An unanswered cell has nothing to lose, so it never counts against a
  // conversion — otherwise a mostly-empty sheet reads as catastrophic.
  if (fromId === toId || isBlank(answer)) return { action: "keep" };

  if (TEXT_BACKED.has(fromId) && TEXT_BACKED.has(toId)) return { action: "keep" };
  if (NUMERIC.has(fromId) && NUMERIC.has(toId)) return { action: "keep" };

  if (NEEDS_A_CHOICE.has(toId)) return { action: "clear" };

  if (TEXT_BACKED.has(toId)) {
    const asText =
      answer.optionLabel ??
      (answer.valueBool !== null ? (answer.valueBool ? "Yes" : "No") : null) ??
      (answer.valueNumber !== null ? String(answer.valueNumber) : null) ??
      answer.valueText;
    if (asText === null) return { action: "clear" };
    return { action: "coerce", next: { ...EMPTY, valueText: asText } };
  }

  if (NUMERIC.has(toId)) {
    const source = answer.valueText ?? answer.optionLabel;
    if (source === null) return { action: "clear" };
    const parsed = Number(source.trim());
    if (source.trim() === "" || Number.isNaN(parsed)) return { action: "clear" };
    return { action: "coerce", next: { ...EMPTY, valueNumber: parsed } };
  }

  return { action: "clear" };
}

/**
 * Why a column cannot be retyped, or null when it can.
 *
 * Blocked rather than cascaded: a BOM quietly losing the field that drives it
 * is a production-floor failure, so the owner is told what to detach instead of
 * discovering it later. Kept pure and separate from Prisma so every rule is
 * testable without a database.
 */
export function blockingReason(field: {
  dependents: { name: string }[];
  bomLineCount: number;
  optionContributionCount: number;
}): string | null {
  if (field.dependents.length > 0) {
    const names = field.dependents.map((d) => `"${d.name}"`).join(", ");
    const verb = field.dependents.length === 1 ? "filters" : "filter";
    return `${names} ${verb} by this column. Remove that link first.`;
  }
  if (field.bomLineCount > 0) {
    return "This column drives a BOM template. Remove it from the recipe first.";
  }
  if (field.optionContributionCount > 0) {
    return "One of this column's choices brings components with it. Remove that BOM first.";
  }
  return null;
}

export function summarisePlans(plans: AnswerPlan[]) {
  return {
    kept: plans.filter((p) => p.action === "keep").length,
    coerced: plans.filter((p) => p.action === "coerce").length,
    cleared: plans.filter((p) => p.action === "clear").length,
  };
}
