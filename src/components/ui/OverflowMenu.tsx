"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconButton } from "./primitives";
import { Icon } from "./icons";

/**
 * Task 114 P0.3 — a menu for actions that don't belong in the primary button
 * row: administrative, terminal, or destructive-ish moves that should be
 * reachable but not the first thing an operator sees. Closes on outside
 * click or Escape, same interaction shape `CommandPalette` already uses.
 *
 * No dependency pulled in for this — the interaction is small enough
 * (toggle, outside-click, Escape) that a library would be more surface
 * area than the problem needs.
 */
export function OverflowMenu({ children, label = "More actions" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <IconButton label={label} tone="default" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)}>
        <Icon name="moreHorizontal" size={18} />
      </IconButton>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className="glass-overlay absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-lg p-1"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function OverflowMenuItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={
        "block w-full rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-sunken " +
        (danger ? "text-danger" : "text-text")
      }
    >
      {children}
    </button>
  );
}
