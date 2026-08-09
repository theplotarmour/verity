/**
 * What a "Link to another record" column can point at, as one flat list.
 *
 * The stored shape is a pair — `refTarget` naming a table, plus `targetGroupId`
 * when that table is ItemMaster. That is two questions for one decision, and the
 * first is spelled in table names the owner never sees anywhere else.
 *
 * He has already built a tree of categories, and everything he can make is a
 * node in it. So the question becomes one: which category? The six targets with
 * no category behind them — counterparties, infrastructure, people — sit in the
 * same list rather than in a separate concept.
 */
type GroupNode = {
  id: string;
  name: string;
  parentId: string | null;
};

export type LinkTarget = {
  /** Stable option id: "group:<id>" for a category, "system:<TYPE>" otherwise. */
  id: string;
  label: string;
  sublabel: string | null;
  searchText: string;
  refTarget: string;
  targetGroupId: string | null;
  /**
   * True when the target's rows carry columns worth choosing between, one of
   * which can be shown in place of the name.
   *
   * True for every category, since Configure can add a column to any of them.
   * False for the built-in lists, which live on their own screens and are
   * pointed at whole.
   */
  hasColumns: boolean;
};

/**
 * Things a column can point at that are not categories.
 *
 * Suppliers, customers, warehouses and staff used to be root categories in the
 * studio. That is the entire reason `domainType` existed: their rows are not
 * ItemMaster, so the studio needed a marker to stop item-shaped actions —
 * delete, CSV import, inline cell edit — firing at the wrong table.
 *
 * They are counterparties, infrastructure and people, not things the factory
 * makes. They live on their own screens now (Purchase, Settings, Team,
 * Customers) and appear here only as somewhere a column can point — exactly as
 * a department or a warehouse bin always did.
 *
 * Nothing else is special any more. Every remaining target is a category the
 * owner built.
 */
export const SYSTEM_LINK_TARGETS = [
  { refTarget: "SUPPLIER", label: "Supplier" },
  { refTarget: "CUSTOMER", label: "Customer" },
  { refTarget: "WAREHOUSE", label: "Warehouse" },
  { refTarget: "WAREHOUSE_BIN", label: "Warehouse bin" },
  { refTarget: "EMPLOYEE", label: "Employee" },
  { refTarget: "DEPARTMENT", label: "Department" },
] as const;

const lower = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(" ").toLowerCase();

/**
 * Where a category sits, without its own name — "Design › A category" for
 * ULTRA.
 *
 * The label is the leaf and this is the context beneath it, rather than the
 * whole path as one line. A dropdown truncates, and a full path puts the
 * distinguishing part last: five families all read "Design › A category › UL…"
 * and the owner cannot tell ROCKER from WINGER. The name he is looking for has
 * to come first.
 */
const ancestry = (path: string[]): string | null =>
  path.length > 1 ? path.slice(0, -1).join(" › ") : null;

export function buildLinkTargets(groups: GroupNode[]): LinkTarget[] {
  const byId = new Map(groups.map((g) => [g.id, g]));

  /** Root-first path, capped so a cycle terminates rather than hanging. */
  const pathOf = (group: GroupNode): string[] => {
    const names: string[] = [];
    let cursor: GroupNode | undefined = group;
    let guard = groups.length + 1;
    while (cursor && guard-- > 0) {
      names.unshift(cursor.name);
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    return names;
  };

  const targets: LinkTarget[] = [];

  // Every category is the same kind of thing now. There is no branch here for
  // record sheets because there are no record sheets.
  for (const group of groups) {
    const path = pathOf(group);
    targets.push({
      id: `group:${group.id}`,
      label: group.name,
      sublabel: ancestry(path) ?? "Category",
      searchText: lower(...path),
      refTarget: "ITEM_GROUP",
      targetGroupId: group.id,
      hasColumns: true,
    });
  }

  for (const s of SYSTEM_LINK_TARGETS) {
    targets.push({
      id: `system:${s.refTarget}`,
      label: s.label,
      sublabel: "Built-in list",
      searchText: lower(s.label, s.refTarget),
      refTarget: s.refTarget,
      targetGroupId: null,
      hasColumns: false,
    });
  }

  return targets;
}

/** The option id for a field as stored, for editing an existing column. */
export function linkTargetIdOf(field: {
  refTarget: string | null;
  targetGroupId: string | null;
}): string | null {
  if (!field.refTarget) return null;
  if (field.refTarget === "ITEM_GROUP") {
    return field.targetGroupId ? `group:${field.targetGroupId}` : null;
  }
  // A column saved against a converted sheet — DESIGN, COLOR — still carries the
  // group it was scoped to, so it reads back as that category rather than
  // vanishing from the picker.
  if (field.targetGroupId) return `group:${field.targetGroupId}`;
  return `system:${field.refTarget}`;
}
