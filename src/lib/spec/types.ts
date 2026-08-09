/** How a spec field stores its answer. */
export type SpecValueKind = "VALUE" | "OPTION" | "REFERENCE";

/**
 * One answer, already resolved to the two strings the templates need.
 * `name` is what a name template prints; `code` is what a code template prints.
 * For a reference this is the target's alias/name and its short code; for an
 * option it is the option's label and shortCode; for a value it is the value
 * with its unit suffix applied.
 */
export type ResolvedValue = {
  name: string;
  code: string;
};

/** Answers keyed by the field's template token, e.g. { brand: {...} }. */
export type ResolvedAnswers = Record<string, ResolvedValue>;

/**
 * One choice in a REFERENCE field's dropdown. Declared here rather than beside
 * the query so client components can type against it without importing a module
 * that pulls Prisma into the browser bundle.
 */
export type RefOption = {
  id: string;
  label: string;
  sublabel: string | null;
  /** Lowercased name + alias + code, for client-side type-ahead. */
  searchText: string;
  /**
   * What `id` actually is, for the column-picking mode where a reference can
   * resolve to any of three things.
   *
   * The form has to know which slot to store the answer in, and an id alone
   * cannot say: an option id and an item id are both opaque strings. Absent
   * means the ordinary case — a record in the target category.
   */
  kind?: "option" | "item" | "text";
};

/**
 * One unsaved answer, as held by the wizard and consumed by the create action.
 * Lives here rather than beside the input component so server actions can
 * import it without reaching into a "use client" module.
 */
export type SpecAnswer = {
  optionId?: string | null;
  valueItemId?: string | null;
  valueRefId?: string | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBool?: boolean | null;
  /**
   * A column-picked key whose slot the form could not determine.
   *
   * Option ids and item ids are both opaque cuids, and the dropdown's visible
   * list — which is filtered, and emptied while a dependent field waits on its
   * parent — is not a safe place to look one up. Rather than guess, the form
   * hands the key over and the server decides against what actually exists.
   * Never written to the database; it is resolved away before the insert.
   */
  refKey?: string | null;
};
