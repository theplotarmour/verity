import { Surface } from "@/components/ui/primitives";

/**
 * Field-level change history for one record (§17).
 *
 * This is the *operational* stream — what changed on this record. It is
 * deliberately not the security stream, which answers a different question
 * ("whose permissions moved") for a different audience, and mixing them would
 * put authentication events in front of an operator who cannot act on them.
 */
export function AuditTrail({
  entries,
}: {
  entries: Array<{
    id: string;
    field: string;
    from: string | null;
    to: string | null;
    at: string;
    command: string | null;
  }>;
}) {
  if (entries.length === 0) {
    return (
      <Surface className="p-5">
        <p className="text-text-secondary m-0">
          No recorded changes. History begins when a command modifies this record.
        </p>
      </Surface>
    );
  }

  return (
    <Surface className="p-1">
      <ol className="list-none m-0 p-0">
        {entries.map((entry) => (
          <li key={entry.id} className="px-4 py-3 border-b border-line last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-text font-medium">{entry.field}</span>
              <time dateTime={entry.at} className="text-[13px] text-text-tertiary tabular shrink-0">
                {entry.at.replace("T", " ").slice(0, 16)}
              </time>
            </div>
            <p className="text-text-secondary m-0 mt-0.5">
              <span className="line-through text-text-tertiary">{entry.from ?? "empty"}</span>
              {" → "}
              <span>{entry.to ?? "empty"}</span>
            </p>
            {entry.command && (
              <p className="font-mono text-[13px] text-text-tertiary m-0 mt-0.5">{entry.command}</p>
            )}
          </li>
        ))}
      </ol>
    </Surface>
  );
}
