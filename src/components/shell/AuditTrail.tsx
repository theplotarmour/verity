import { EmptyState } from "@/components/ui/primitives";

/**
 * Field-level change history for one record (§17).
 *
 * This is the *operational* stream — what changed on this record. It is
 * deliberately not the security stream, which answers a different question
 * ("whose permissions moved") for a different audience, and mixing them would
 * put authentication events in front of an operator who cannot act on them.
 *
 * COMPOSITION
 * Renders bare — no surface of its own — so the caller decides the container.
 * It is always shown inside a `Panel`, and a card nested directly inside a card
 * produces a double border that reads as a rendering mistake.
 *
 * Each entry leads with the field, because that is what the reader is scanning
 * for. The old value is struck through and recedes; the new value holds normal
 * ink. The command key sits last in mono at the smallest size — it matters when
 * you are tracing a change back to its cause and is noise the rest of the time.
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
      <EmptyState
        title="No recorded changes"
        description="History begins when a command modifies this record."
      />
    );
  }

  return (
    <ol className="m-0 list-none divide-y divide-line p-0">
      {entries.map((entry) => (
        <li key={entry.id} className="px-5 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-medium text-text">{entry.field}</span>
            <time dateTime={entry.at} className="tabular shrink-0 text-[12px] text-text-tertiary">
              {entry.at.replace("T", " ").slice(0, 16)}
            </time>
          </div>
          {/* The spaces around the arrow are literal, not margins. This line is
              read, copied and asserted on as one string, and styling the gap
              instead of writing it collapses the text content to
              "in_service→maintenance". The arrow is not aria-hidden either:
              direction is the meaning here, not decoration. */}
          <p className="m-0 mt-1 text-[13px] leading-relaxed">
            <span className="text-text-tertiary line-through">{entry.from ?? "empty"}</span>
            <span className="text-text-tertiary">{" → "}</span>
            <span className="text-text-secondary">{entry.to ?? "empty"}</span>
          </p>
          {entry.command && (
            <p className="m-0 mt-1 font-mono text-[11.5px] text-text-tertiary">{entry.command}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
