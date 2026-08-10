/**
 * Resolving a category's BOM mode through the tree.
 *
 * `ItemGroup.bomMode` is nullable, and null means "whatever my parent says".
 * A subcategory of Finished Good is a finished good; making an owner restate
 * the mode on each of forty children is how the two drift apart.
 *
 * Null is inheritance rather than a default. A column default would give a new
 * category a BOM behaviour nobody chose and no way to see it had been chosen —
 * the exact problem that stating the mode was meant to remove. Inheritance is
 * visible: Configure reads "inherited from Finished Good", and following the
 * parent is a decision the owner can see and disagree with.
 */

export type BomModeValue = "OFF" | "RECIPE" | "INGREDIENTS";

/**
 * The least a node must carry to be resolvable. Anything wider also fits.
 *
 * `bomMode` is optional as well as nullable because the screens that select it
 * type the field optional. Absent and null mean the same thing here — the
 * category states nothing — and a signature that accepted only one of them
 * would push a cast onto every caller.
 */
export interface BomModeNode {
  id: string;
  parentId: string | null;
  bomMode?: BomModeValue | null;
}

/** A prebuilt id → node index, for callers resolving more than one category. */
export type BomModeIndex = ReadonlyMap<string, BomModeNode>;

function indexOf(groups: Iterable<BomModeNode> | BomModeIndex): BomModeIndex {
  if (groups instanceof Map) return groups;
  const byId = new Map<string, BomModeNode>();
  for (const g of groups as Iterable<BomModeNode>) byId.set(g.id, g);
  return byId;
}

/** Where a resolved mode came from — Configure shows the difference. */
export interface ResolvedBomMode {
  mode: BomModeValue;
  /** True when the category states its own mode rather than following a parent. */
  stated: boolean;
  /** The ancestor the mode came from, or null when stated or defaulted to OFF. */
  inheritedFromId: string | null;
}

/**
 * Resolve one category's mode by walking to the nearest ancestor that states one.
 *
 * Falls back to OFF when nothing on the path states a mode, which is also what
 * an unreachable parent gives: a category whose parent id points at a group in
 * another factory (or at nothing) must not read through to it, and must not
 * throw either — a broken parent link should cost the owner a BOM editor, not
 * the whole page.
 *
 * Cycles terminate. `parentId` is a self-referential FK with no database-level
 * guard against a loop, and a loop here would hang a server render rather than
 * show a wrong answer, which is far worse.
 */
export function resolveBomMode(
  groupId: string,
  groups: Iterable<BomModeNode> | BomModeIndex,
): ResolvedBomMode {
  const byId = indexOf(groups);

  const start = byId.get(groupId);
  if (!start) return { mode: "OFF", stated: false, inheritedFromId: null };
  if (start.bomMode) return { mode: start.bomMode, stated: true, inheritedFromId: null };

  const seen = new Set<string>([groupId]);
  let cursor = start.parentId ? byId.get(start.parentId) : undefined;

  while (cursor) {
    if (seen.has(cursor.id)) break; // cycle — stop rather than spin
    seen.add(cursor.id);
    if (cursor.bomMode) {
      return { mode: cursor.bomMode, stated: false, inheritedFromId: cursor.id };
    }
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }

  return { mode: "OFF", stated: false, inheritedFromId: null };
}

/** Just the mode, for the many call sites that do not care where it came from. */
export function bomModeOf(
  groupId: string,
  groups: Iterable<BomModeNode> | BomModeIndex,
): BomModeValue {
  return resolveBomMode(groupId, groups).mode;
}

/**
 * Resolve every category in one pass, for a screen that renders a whole tree.
 *
 * Calling `resolveBomMode` per row is O(n·depth) and rebuilds the index each
 * time; a list of four hundred categories does that four hundred times.
 */
export function resolveAllBomModes(
  groups: Iterable<BomModeNode> | BomModeIndex,
): Map<string, ResolvedBomMode> {
  const byId = indexOf(groups);

  const out = new Map<string, ResolvedBomMode>();
  for (const id of byId.keys()) out.set(id, resolveBomMode(id, byId));
  return out;
}
