"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/primitives";

/**
 * The Smart Table's slide-in detail panel.
 *
 * Authority: `Verity_Component_Specification.md` §3.A, `Verity_Motion_Architecture.md`
 * §3.A. Reuses the exact scrim/overlay pattern already established in
 * `ShellChrome.tsx`'s mobile navigation sheet (`verity-scrim` + `glass-overlay`,
 * ADR-011 elevated glass) rather than inventing a second overlay language —
 * this is the platform's second consumer of that pattern, not a new one.
 *
 * Content is passed as `children` so the next Smart Table call site reuses
 * this panel without a redesign.
 */
export function ContextPanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const reducedMotion = useReducedMotion();

  // Escape closes; focus moves into the panel on open and the browser
  // restores it to the triggering row on close because that element is still
  // in the DOM and never lost focus-ability — no manual ref bookkeeping needed.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Minimal focus trap: Tab past either end wraps rather than escaping
      // to the scrim button or the page behind it.
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Matches --ease-slide / an ease-in variant in globals.css. framer-motion's
  // `ease` accepts a bezier point array, not a CSS var() reference, so the
  // values are duplicated here — keep them in sync with globals.css by hand.
  const slideIn = [0.32, 0.94, 0.6, 1] as const;
  const slideOut = [0.5, 0, 0.75, 0] as const;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            aria-label={`Close ${title}`}
            className="verity-scrim absolute inset-0 border-0"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.25 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="glass-overlay relative flex h-full w-full max-w-[420px] flex-col gap-5 overflow-y-auto border-l border-line p-6 outline-none"
            initial={reducedMotion ? { opacity: 0 } : { x: "100%" }}
            animate={reducedMotion ? { opacity: 1 } : { x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { x: "100%" }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: open ? 0.25 : 0.2, ease: open ? slideIn : slideOut }
            }
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id={titleId} className="m-0 text-[17px] font-normal text-text">
                {title}
              </h2>
              <Button size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
