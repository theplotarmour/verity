"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconButton } from "./primitives";
import { Icon } from "./icons";
import { prefersReducedMotion, reducedMotionFade, springDefault } from "@/lib/motion";

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

  // APPLE-P1-02: focus lifecycle. `children` are arbitrary `OverflowMenuItem`s
  // with no shared ref array, so items are found by querying the DOM inside
  // this instance's own wrapper — scoped correctly since every `OverflowMenu`
  // has its own `ref`, and simpler than threading refs through every caller.
  function items(): HTMLElement[] {
    return Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  }

  function closeAndRestoreFocus() {
    setOpen(false);
    ref.current?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')?.focus();
  }

  useEffect(() => {
    if (!open) return;
    // Menu content mounts via AnimatePresence on the next tick.
    const raf = requestAnimationFrame(() => items()[0]?.focus());
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAndRestoreFocus();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const list = items();
    const currentIndex = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(currentIndex + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(currentIndex - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list[list.length - 1]?.focus();
    }
  };

  return (
    <div ref={ref} className="relative inline-block">
      <IconButton label={label} tone="default" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)}>
        <Icon name="moreHorizontal" size={18} />
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={prefersReducedMotion() ? reducedMotionFade : springDefault}
            style={{ transformOrigin: "top right" }}
            className="glass-overlay absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-lg p-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
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
