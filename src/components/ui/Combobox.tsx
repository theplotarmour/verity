"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Second line — availability, GSTIN, a price. Searched as well as shown. */
  note?: string;
  disabled?: boolean;
};

/**
 * A single-select control you can type into.
 *
 * Task 71 item 1. Every picker on the desks was a native `<select>`. That is
 * fine for four godowns and unusable for four hundred boards: the native
 * control's own type-ahead matches a prefix only, resets after a second, and
 * cannot match on the middle of a name — so finding "18mm Gurjan MR" meant
 * scrolling a list the length of the catalogue.
 *
 * Matching is on every word of the query against label and note, in any order
 * and any position, so "gurjan 18" finds "18mm Gurjan MR" and "greenply"
 * finds a board by its brand note.
 *
 * The selected value is submitted through a hidden input, so the surrounding
 * `<form action={…}>` reads it out of FormData exactly like the select it
 * replaces — callers did not have to change how they submit.
 */
export function Combobox({
  id,
  name,
  options,
  value,
  onChange,
  placeholder = "Search…",
  required,
  disabled,
  autoFocus,
  emptyMessage = "Nothing matches",
}: {
  id: string;
  /** Omit for a controlled-only combobox that is not part of a form post. */
  name?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  emptyMessage?: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const matches = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.note ?? ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [options, query]);

  // The highlighted row must exist in the current match set. Without this a
  // filter that shortens the list leaves the highlight past its end, and Enter
  // then selects nothing while looking like it should select something.
  useEffect(() => {
    setActive((current) => (current < matches.length ? current : 0));
  }, [matches.length]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  });

  // Keeps the highlighted row in view under arrow-key navigation. Without it
  // the highlight walks off the bottom of a scrolled list invisibly.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function commit(option: ComboboxOption) {
    if (option.disabled) return;
    onChange(option.value);
    close();
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => {
        if (matches.length === 0) return 0;
        return (current + step + matches.length) % matches.length;
      });
      return;
    }
    if (event.key === "Enter") {
      // Only swallow Enter while the list is open. Otherwise this would
      // suppress the surrounding form's submit-on-Enter, which is how people
      // finish short forms.
      if (!open) return;
      event.preventDefault();
      const option = matches[active];
      if (option) commit(option);
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        close();
      }
      return;
    }
    if (event.key === "Tab") close();
  }

  const controlClass =
    "glass-control flex h-11 w-full items-center gap-2 rounded-lg px-4 text-[14px] " +
    "transition-[border-color,box-shadow] duration-200 hover:border-line-strong " +
    "focus-within:border-accent " +
    "focus-within:shadow-[var(--shadow-highlight),0_0_0_3px_var(--color-accent-subtle)] " +
    (disabled ? "cursor-not-allowed opacity-55 " : "");

  return (
    <div ref={rootRef} className="relative">
      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          // Not `required` on the hidden input — a hidden required field blocks
          // submission with a validation bubble the browser cannot point at.
          // The visible input below carries the requirement instead.
          readOnly
        />
      )}

      <div className={controlClass}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && matches[active] ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          autoFocus={autoFocus}
          // While closed the input displays the selection; while open it is a
          // search box. Two jobs, but one box — a separate trigger and search
          // field is an extra click on every use.
          value={open ? query : (selected?.label ?? "")}
          placeholder={selected ? selected.label : placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          // Reports "please fill in this field" against the visible control
          // when nothing is chosen, which is what `required` on a select did.
          required={required && !value}
          className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-tertiary"
        />

        {value && !required && !disabled && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              onChange("");
              setQuery("");
              inputRef.current?.focus();
            }}
            className="shrink-0 text-text-tertiary transition-colors hover:text-text"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}

        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-text-tertiary"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className={
            "glass-overlay absolute left-0 right-0 top-[calc(100%+4px)] z-50 m-0 max-h-64 " +
            "list-none overflow-y-auto rounded-lg border border-line p-1 shadow-[var(--shadow-lg)]"
          }
        >
          {matches.length === 0 && (
            <li className="px-3 py-2 text-[13px] text-text-tertiary">
              {emptyMessage}
            </li>
          )}
          {matches.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              data-index={index}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              // pointerdown, not click: the outside-click handler also listens
              // on pointerdown, and a click handler would fire after the list
              // had already closed.
              onPointerDown={(event) => {
                event.preventDefault();
                commit(option);
              }}
              onPointerEnter={() => setActive(index)}
              className={
                "cursor-pointer rounded-md px-3 py-2 text-[14px] " +
                (option.disabled
                  ? "cursor-not-allowed text-text-tertiary "
                  : index === active
                    ? "bg-accent-subtle text-text "
                    : "text-text ") +
                (option.value === value ? "font-medium " : "")
              }
            >
              <span className="block truncate">{option.label}</span>
              {option.note && (
                <span className="mt-0.5 block truncate text-[12px] text-text-tertiary">
                  {option.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
