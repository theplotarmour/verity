/**
 * The column model behind Configure mode.
 *
 * Data mode's columns and the Add Master Data form's questions are the same
 * list rendered two ways, so everything that decides what a column *is* lives
 * here — free of React and of Prisma, and therefore cheap to test.
 */

/**
 * The three columns every sheet has, in grid order.
 *
 * They are ItemMaster scalars rather than SpecFields, so they cannot be
 * retyped or deleted — but their headers are per-group, because record sheets
 * reuse the slots for their own meaning (Warehouse puts its kind in the alias
 * column, Supplier its contact person).
 */
export const BUILTIN_COLUMNS = [
  { id: "code", defaultLabel: "Code", canHide: false },
  { id: "name", defaultLabel: "Label", canHide: false },
  { id: "alias", defaultLabel: "Alias", canHide: true },
] as const;

export type BuiltinColumnId = (typeof BUILTIN_COLUMNS)[number]["id"];

export type ColumnLabelSource = {
  codeLabel: string | null;
  nameLabel: string | null;
  aliasLabel: string | null;
};

/** A blank label is treated as unset, so an empty header can never render. */
export function resolveColumnLabels(
  group: ColumnLabelSource
): Record<BuiltinColumnId, string> {
  const pick = (custom: string | null, fallback: string) =>
    custom && custom.trim() ? custom.trim() : fallback;

  return {
    code: pick(group.codeLabel, "Code"),
    name: pick(group.nameLabel, "Label"),
    alias: pick(group.aliasLabel, "Alias"),
  };
}

export type FieldColumn<T> = {
  field: T;
  /** True when an ancestor defines this field, so it is read-only here. */
  inherited: boolean;
  /** The defining category's name, for the badge. Null when it is our own. */
  ownerName: string | null;
};

/**
 * Split a resolved field list into own and inherited.
 *
 * getResolvedFields merges ancestors in, so the list a subcategory renders
 * contains fields belonging to groups above it. Editing those in place would
 * silently change every sibling, so the UI has to tell them apart.
 */
export function classifyFields<T extends { id: string; groupId: string }>(
  fields: T[],
  activeGroupId: string,
  groupNameById: Map<string, string>
): FieldColumn<T>[] {
  return fields.map((field) => {
    const inherited = field.groupId !== activeGroupId;
    return {
      field,
      inherited,
      ownerName: inherited ? groupNameById.get(field.groupId) ?? "another category" : null,
    };
  });
}

export type ColumnTypeChoice = {
  id: string;
  label: string;
  hint: string;
  kind: "VALUE" | "OPTION" | "REFERENCE";
  valueType: string | null;
};

/**
 * One flat list of column types, in plain language.
 *
 * SpecField stores this as `kind` plus `valueType`, which is two questions for
 * one decision — and both of them spelled in database enums. The owner picks
 * once here and the pair is derived on save.
 */
export const COLUMN_TYPES: ColumnTypeChoice[] = [
  { id: "TEXT", label: "Text", hint: "Any words — a brand, a note", kind: "VALUE", valueType: "TEXT" },
  { id: "TEXTAREA", label: "Long text", hint: "A paragraph, on its own line", kind: "VALUE", valueType: "TEXTAREA" },
  { id: "NUMBER", label: "Number", hint: "A plain figure", kind: "VALUE", valueType: "NUMBER" },
  { id: "MEASUREMENT", label: "Number with unit", hint: "220 becomes 220 GSM", kind: "VALUE", valueType: "MEASUREMENT" },
  { id: "TOGGLE", label: "Yes / No", hint: "A tick box", kind: "VALUE", valueType: "TOGGLE" },
  { id: "DATE", label: "Date", hint: "Picked from a calendar", kind: "VALUE", valueType: "DATE" },
  { id: "COLOR", label: "Colour swatch", hint: "Picked from a palette", kind: "VALUE", valueType: "COLOR" },
  { id: "IMAGE", label: "Picture", hint: "One uploaded image", kind: "VALUE", valueType: "IMAGE" },
  { id: "FILE", label: "File", hint: "Any attachment", kind: "VALUE", valueType: "FILE" },
  { id: "OPTION", label: "Pick from a list", hint: "You set the choices", kind: "OPTION", valueType: null },
  { id: "REFERENCE", label: "Link to another record", hint: "An item, supplier or design", kind: "REFERENCE", valueType: null },
];

const BY_ID = new Map(COLUMN_TYPES.map((t) => [t.id, t]));

/** The choice id for a stored field. Unknown combinations read as text. */
export function columnTypeId(kind: string, valueType: string | null): string {
  if (kind === "OPTION") return "OPTION";
  if (kind === "REFERENCE") return "REFERENCE";
  return valueType && BY_ID.has(valueType) ? valueType : "TEXT";
}

export function columnTypeLabel(kind: string, valueType: string | null): string {
  return BY_ID.get(columnTypeId(kind, valueType))!.label;
}
