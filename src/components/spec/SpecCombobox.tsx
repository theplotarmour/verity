"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SpecSelect } from "./SpecSelect";
import { useDropdownPosition } from "@/components/ui/dropdown-position";
import type { RefOption } from "@/lib/spec/types";

type Props = {
  options: RefOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** When set, an unmatched query offers inline creation. */
  onCreate?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledReason?: string;
  autoFocus?: boolean;
  /**
   * Treat the typed text as the value itself. Options become suggestions of what
   * has been entered before rather than a closed list, so a new supplier lead
   * time needs no "add" step — you just type it.
   */
  freeText?: boolean;
  inputMode?: "text" | "numeric" | "decimal";
  /** Widen the list for what has been typed. See SpecSelect. */
  onSearch?: (query: string) => void;
};

/**
 * Single-value picker, kept as its own name because most of the app holds one
 * id and not an array.
 *
 * The list itself is SpecSelect, so every dropdown in Verity shows the same
 * searchable checkbox list whether it takes one value or several.
 */
export function SpecCombobox({
  options,
  value,
  onChange,
  onCreate,
  placeholder,
  disabled,
  disabledReason,
  autoFocus,
  freeText = false,
  inputMode,
  onSearch,
}: Props) {
  const selected = useMemo(() => (value ? [value] : []), [value]);

  if (!freeText) {
    return (
      <SpecSelect
        options={options}
        selected={selected}
        onChange={(ids) => onChange(ids[0] ?? null)}
        onCreate={onCreate}
        placeholder={placeholder}
        disabled={disabled}
        disabledReason={disabledReason}
        autoFocus={autoFocus}
        onSearch={onSearch}
      />
    );
  }

  return (
    <FreeTextInput
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      disabledReason={disabledReason}
      autoFocus={autoFocus}
      inputMode={inputMode}
    />
  );
}

/**
 * Free text with suggestions — deliberately not a checkbox list.
 *
 * Nothing is being chosen from a set here: the typed characters *are* the
 * answer, and the rows below only offer what this field has held before. Ticks
 * would imply a closed list that does not exist.
 */
function FreeTextInput({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  disabledReason,
  autoFocus,
  inputMode,
}: Omit<Props, "onCreate" | "freeText">) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  // Portalled and fixed, so the suggestions escape the studio's scroll panes
  // and flip above the input when it sits near the bottom of the screen.
  const { anchorRef, style } = useDropdownPosition<HTMLInputElement>(open);

  const matches = useMemo(() => {
    // Unordered token match, like the production variant search: every word must
    // appear in the option, in any order — "shaka db" finds "... DB ... Shaka".
    const words = (value ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return options.slice(0, 50);
    return options.filter((o) => words.every((w) => o.searchText.includes(w))).slice(0, 50);
  }, [options, value]);

  function closeAfterFocusSettles() {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (anchorRef.current?.contains(active) || listRef.current?.contains(active)) return;
      setOpen(false);
    }, 0);
  }

  return (
    <div className="relative" title={disabled ? disabledReason : undefined}>
      <input
        ref={anchorRef}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value ?? ""}
        placeholder={placeholder}
        inputMode={inputMode}
        onFocus={() => {
          setOpen(true);
          setCursor(0);
        }}
        onBlur={closeAfterFocusSettles}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setCursor(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setCursor((c) => Math.min(c + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === "Enter" && open && matches[cursor]) {
            e.preventDefault();
            onChange(matches[cursor].label);
            setOpen(false);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:ring-1 focus:ring-[var(--brand)] disabled:bg-surface-secondary/40 disabled:text-text-tertiary"
      />
      {open && matches.length > 0 && style && createPortal(
        <ul
          ref={listRef}
          style={style}
          className="z-[100000] overflow-auto rounded-xl border border-border bg-surface shadow-lg"
        >
          {matches.map((o, i) => (
            <li
              key={o.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.label);
                setOpen(false);
              }}
              onMouseEnter={() => setCursor(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === cursor ? "bg-brand-soft text-[var(--brand)]" : "text-text-primary"
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
