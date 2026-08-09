/**
 * The template token derived from a field's display name: "Back Type" becomes
 * "backType", which the owner then writes as {backType} in a name or code
 * template.
 *
 * Kept out of the server-action module because "use server" files may only
 * export async functions.
 */
export function toFieldKey(name: string): string {
  const parts = name
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  if (parts.length === 0) return "field";

  return (
    parts[0] +
    parts
      .slice(1)
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join("")
  );
}
