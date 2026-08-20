/**
 * One choice in a searchable item dropdown.
 *
 * Declared here rather than beside the query so client components can type
 * against it without importing a module that pulls Prisma into the browser
 * bundle. It came from the spec engine's `RefOption`, which is why the shape
 * carries a `kind` — the picker could resolve to an option, an item or free
 * text. Only `item` and `text` are reachable now.
 */
export type ItemOption = {
  id: string;
  label: string;
  sublabel: string | null;
  /** Lowercased name + alias + code, for client-side type-ahead. */
  searchText: string;
  kind?: "option" | "item" | "text";
};
