"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, UserPlus } from "lucide-react";

import { Input } from "@/components/ui/primitives";

/**
 * Choose a customer from the master list, or name a new one.
 *
 * Typing a name into a plain box and matching it server-side was how this
 * worked, and it made the master list a record of typos: "Sharma Motors",
 * "sharma motors " and "Sharma Motor" are three customers, none of which can be
 * invoiced together. The match was case-insensitive but exact, so a single
 * character created a new account silently.
 *
 * Selection from the list is therefore the primary path and returns an id. The
 * free-text path stays, because a walk-in whose name is not yet on the list must
 * not be a dead end — but it is now visibly the exception, and the caller can
 * tell an existing customer from a new one by whether an id came back.
 */
export interface CustomerOption {
  id: string;
  name: string;
  phone?: string | null;
}

export function CustomerPicker({
  customers,
  value,
  onChange,
  error,
  disabled,
  placeholder = "Search customers, or type a new name",
}: {
  customers: CustomerOption[];
  /** The current selection. `id` is null for a name that is not on the list. */
  value: { id: string | null; name: string };
  onChange: (next: { id: string | null; name: string; phone?: string | null }) => void;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // What the box shows: the typed query while searching, the chosen name at rest.
  const text = open ? query : value.name;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "")),
        )
      : customers;
    // Capped because a factory with two thousand customers should not render
    // two thousand rows into a dropdown on every keystroke.
    return pool.slice(0, 50);
  }, [customers, query]);

  // Only offered when the typed name is not already an exact match, so the
  // control never invites creating a duplicate of the row directly above it.
  const exact = customers.some(
    (c) => c.name.trim().toLowerCase() === query.trim().toLowerCase(),
  );
  const canCreate = query.trim().length > 0 && !exact;

  function choose(option: CustomerOption) {
    onChange({ id: option.id, name: option.name, phone: option.phone ?? null });
    setQuery("");
    setOpen(false);
  }

  function createFromQuery() {
    onChange({ id: null, name: query.trim() });
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          error={error}
          disabled={disabled}
          placeholder={placeholder}
          value={text}
          onFocus={() => {
            setQuery(value.name);
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            // Keep the caller in step while typing, with no id: a half-typed
            // name is not the customer that was selected a moment ago, and
            // leaving the old id attached would book the order against them.
            onChange({ id: null, name: event.target.value });
          }}
          onBlur={() => {
            // Deferred so a click on an option lands before the list unmounts.
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && open) {
              event.preventDefault();
              if (matches.length === 1) choose(matches[0]);
              else if (canCreate) createFromQuery();
            }
          }}
          className="pr-9"
        />
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          aria-hidden
        />
      </div>

      {open && (
        <div
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg"
          onMouseDown={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
          }}
        >
          {matches.map((option) => {
            const selected = option.id === value.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => choose(option)}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm text-text-primary transition hover:bg-surface-secondary"
              >
                <span className="min-w-0">
                  <span className="block truncate">{option.name}</span>
                  {option.phone && (
                    <span className="block truncate text-[11px] text-text-tertiary">
                      {option.phone}
                    </span>
                  )}
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-[var(--brand)]" />}
              </button>
            );
          })}

          {matches.length === 0 && !canCreate && (
            <p className="px-3 py-2 text-[13px] text-text-tertiary">No customers yet.</p>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={createFromQuery}
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text-primary transition hover:bg-surface-secondary"
            >
              <UserPlus className="h-4 w-4 shrink-0 text-[var(--brand)]" />
              <span className="min-w-0 truncate">
                Add <span className="font-semibold">{query.trim()}</span> as a new customer
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
