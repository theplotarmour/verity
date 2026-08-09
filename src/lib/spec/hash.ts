import { createHash } from "node:crypto";

/**
 * The item's identity: a stable digest of its group plus every answered field.
 *
 * Values are the storage identities — option ids, referenced row ids, raw text —
 * never display labels, so renaming a fabric does not change the identity of
 * every seat cover that uses it.
 *
 * Empty answers are excluded so that adding an optional field to a group does
 * not silently change the identity of items already stored.
 */
export function specHash(groupId: string, answers: Record<string, string>): string {
  const entries = Object.entries(answers)
    .filter(([, value]) => value !== "" && value !== null && value !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    // Length-prefix each part so ("ab","c") cannot collide with ("a","bc").
    .map(([key, value]) => `${key.length}:${key}=${value.length}:${value}`);

  return createHash("sha256").update(`${groupId}|${entries.join("|")}`).digest("hex");
}
