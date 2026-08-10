/**
 * BOM mode inheritance.
 *
 * `ItemGroup.bomMode` is nullable, and null does not mean OFF — it means
 * "whatever my parent says". A factory that turns RECIPE on for "Seat Covers"
 * means it for "Seat Covers > Bucket" too, and previously had to set it on every
 * child and keep them in step by hand.
 *
 * The walk is pure and lives here rather than in a server action because both
 * sides need it: the server resolves it against the database, and the master
 * data screens already hold the whole group tree in memory and would otherwise
 * re-derive it — the "same logic in two places" trap that has already cost this
 * codebase a login outage.
 */

export type BomModeValue = "OFF" | "RECIPE" | "INGREDIENTS";

export interface BomModeNode {
  id: string;
  parentId: string | null;
  /**
   * `undefined` is accepted alongside `null` and treated the same. Several call
   * sites carry this as an optional prop, and forcing them to normalise first
   * is how a `?? "OFF"` gets reintroduced at the boundary — which is the exact
   * bug this module exists to remove.
   */
  bomMode?: BomModeValue | null;
}

/** A root category with nothing set has no BOM editor. */
export const DEFAULT_BOM_MODE: BomModeValue = "OFF";

/**
 * Walk up from `groupId` and return the first mode anyone actually stated.
 *
 * `nodes` may be an array or a Map; both are common at the call sites. Cycles
 * cannot happen through the UI (the parent picker excludes descendants) but the
 * seen-set is cheap and a cycle here would hang a page render.
 */
export function resolveBomModeFromTree(
  groupId: string | null | undefined,
  nodes: Iterable<BomModeNode>,
): BomModeValue {
  if (!groupId) return DEFAULT_BOM_MODE;

  const byId = new Map<string, BomModeNode>();
  for (const node of nodes) byId.set(node.id, node);

  const seen = new Set<string>();
  let current = byId.get(groupId);

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.bomMode) return current.bomMode;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return DEFAULT_BOM_MODE;
}

/** Whether a resolved mode means the category gets a BOM editor at all. */
export function bomEnabled(mode: BomModeValue): boolean {
  return mode !== "OFF";
}
