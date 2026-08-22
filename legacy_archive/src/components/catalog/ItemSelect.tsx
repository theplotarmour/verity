"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDropdownPosition } from "@/components/ui/dropdown-position";
import type { ItemOption } from "./types";

type Props = {
  options: ItemOption[];
  /** Always an array, whether or not the field takes more than one value. */
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Accumulate values instead of replacing; the list stays open while ticking. */
  multi?: boolean;
  /** When set, an unmatched query offers inline creation. */
  onCreate?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledReason?: string;
  autoFocus?: boolean;
  /**
   * Ask the owner of `options` to widen the list for what has been typed.
   *
   * Absent means the list is already everything there is — a unit, a colour, a
   * handful of departments — and the filter below is the whole story. Present
   * means the list is a page of a larger set, so typing has to reach the server
   * or the rows past the first thousand would be unreachable. Local filtering
   * stays either way: it is what makes the narrowing feel instant while the
   * request is still out.
   */
  onSearch?: (query: string) => void;
};

/**
 * One dropdown for the whole app: a searchable checkbox list.
 *
 * Single and multi select used to be two components with two visual languages,
 * so the same act — picking a fabric — looked different depending on where you
 * were standing. Here the list always looks the same and `multi` only changes
 * whether ticking one clears the last.
 *
 * The checkbox is deliberately visible even when only one value is allowed: it
 * shows at a glance what is currently chosen, which a plain text field cannot.
 */
export function ItemSelect({
  options,
  selected,
  onChange,
  multi = false,
  onCreate,
  placeholder,
  disabled,
  disabledReason,
  autoFocus,
  onSearch,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const suppressNextOpen = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);
  // Portalled and fixed: the spec grid and studio are full of scroll panes that
  // would otherwise clip this list, and near the bottom it has to open upward.
  const { anchorRef, style } = useDropdownPosition<HTMLInputElement>(open);

  // Debounced: a request per keystroke would have the answers arriving out of
  // order, and the later one is not always the one that lands last.
  useEffect(() => {
    // Only for text actually typed. Firing on the empty query re-fetched the
    // unfiltered list and merged it back in, which quietly undid every
    // narrowing the form had applied — pick Tata and Swift would reappear.
    // The unfiltered list is the parent's job; this only ever widens the list
    // to reach something the first page did not include.
    if (!onSearch || !query.trim()) return;
    const timer = setTimeout(() => onSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const chosen = useMemo(() => new Set(selected), [selected]);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const matches = useMemo(() => {
    // Unordered token match, like the production variant search.
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = words.length
      ? options.filter((o) => words.every((w) => o.searchText.includes(w)))
      : options;
    // Ticked values stay reachable even when the filter would hide them, so
    // narrowing the search can never make a selection disappear.
    const pinned = options.filter((o) => chosen.has(o.id) && !list.includes(o));
    return [...pinned, ...list].slice(0, 200);
  }, [options, query, chosen]);

  // Offered whenever something is typed, not only when nothing matches — with
  // "Suede Blue" on the list there was no way to add "Suede Dark Blue". It sits
  // last so Enter lands on a real match first: creating "Leatherite Blck"
  // because it beat the correct row to the cursor is not a recoverable mistake.
  const canCreate = Boolean(onCreate) && query.trim().length > 0;
  const rowCount = matches.length + (canCreate ? 1 : 0);

  function toggle(id: string) {
    if (!multi) {
      onChange(chosen.has(id) ? [] : [id]);
      setQuery("");
      suppressNextOpen.current = true;
      setOpen(false);
      return;
    }
    onChange(chosen.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  function commit(index: number) {
    if (canCreate && index === matches.length) {
      onCreate!(query.trim());
      setQuery("");
      if (!multi) {
        suppressNextOpen.current = true;
        setOpen(false);
      }
      return;
    }
    if (matches[index]) toggle(matches[index].id);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(c + 1, rowCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open) commit(cursor);
    } else if (e.key === "Tab") {
      if (open && rowCount > 0 && !multi) commit(cursor);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && selected.length) {
      onChange(selected.slice(0, -1));
    }
  }

  function closeAfterFocusSettles() {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (anchorRef.current?.contains(active) || listRef.current?.contains(active)) return;
      setOpen(false);
    }, 0);
  }

  const label =
    selected.length === 0
      ? ""
      : selected.length === 1
        ? byId.get(selected[0])?.label ?? ""
        : `${selected.length} selected`;

  return (
    <div className="relative" title={disabled ? disabledReason : undefined}>
      <input
        ref={anchorRef}
        autoFocus={autoFocus}
        disabled={disabled}
        value={open ? query : label}
        placeholder={placeholder}
        onFocus={() => {
          if (suppressNextOpen.current) {
            suppressNextOpen.current = false;
            return;
          }
          setOpen(true);
          setCursor(0);
        }}
        onBlur={closeAfterFocusSettles}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setCursor(0);
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:ring-1 focus:ring-[var(--brand)] disabled:bg-surface-secondary/40 disabled:text-text-tertiary"
      />

      {/* Chips only when several are held: with one value the input already
          says which, and a chip under it would just repeat itself. */}
      {multi && selected.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {selected.map((id) => (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(selected.filter((s) => s !== id))}
              className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-[var(--brand)]"
            >
              {byId.get(id)?.label ?? id}
              <span aria-hidden>×</span>
              <span className="sr-only">Remove</span>
            </button>
          ))}
        </div>
      )}

      {open && style && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          aria-multiselectable={multi}
          style={style}
          className="z-[100000] overflow-auto rounded-xl border border-border bg-surface shadow-lg"
        >
          {matches.length === 0 && !canCreate && (
            <li className="px-3 py-2 text-xs text-text-tertiary">No matches</li>
          )}

          {matches.map((o, i) => {
            const on = chosen.has(o.id);
            return (
              <li
                key={o.id}
                role="option"
                aria-selected={on}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(i);
                }}
                onMouseEnter={() => setCursor(i)}
                className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm ${
                  i === cursor ? "bg-brand-soft text-[var(--brand)]" : "text-text-primary"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${
                    on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-border"
                  }`}
                >
                  {on ? "✓" : ""}
                </span>
                {/* The name wraps rather than truncating, and its context sits
                    under it. Both on one truncating line meant five options
                    reading "Design › A category › UL…" with nothing to tell
                    them apart. */}
                <span className="min-w-0 flex-1">
                  <span className="block break-words">{o.label}</span>
                  {o.sublabel && (
                    <span className="block text-xs text-text-tertiary break-words">
                      {o.sublabel}
                    </span>
                  )}
                </span>
              </li>
            );
          })}

          {canCreate && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(matches.length);
              }}
              onMouseEnter={() => setCursor(matches.length)}
              className={`cursor-pointer px-3 py-2 text-sm font-bold ${
                cursor === matches.length ? "bg-brand-soft text-[var(--brand)]" : "text-text-primary"
              }`}
            >
              ＋ Add &ldquo;{query.trim()}&rdquo;
            </li>
          )}
        </ul>,
        document.body
      )}
    </div>
  );
}
