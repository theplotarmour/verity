import type { ColumnDescriptor } from "@/server/platform/experience";

/**
 * Renders a table from column descriptors, applying a formatter per declared
 * type (implementation/08-experience/metadata-driven-ui.md).
 *
 * Platform scaffolding, intentionally unstyled.
 */

function format(value: unknown, as: ColumnDescriptor["format"]): string {
  if (value === null || value === undefined) return "";
  switch (as) {
    case "number":
      return typeof value === "number" ? value.toLocaleString() : String(value);
    case "date":
      return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
    case "boolean":
      return value ? "Yes" : "No";
    default:
      return String(value);
  }
}

export function DynamicTable({
  columns,
  rows,
}: {
  columns: ColumnDescriptor[];
  rows: Array<Record<string, unknown>>;
}) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.name} scope="col">
              {c.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={(row.id as string) ?? index}>
            {columns.map((c) => (
              <td key={c.name} data-format={c.format}>
                {format(row[c.name], c.format)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
