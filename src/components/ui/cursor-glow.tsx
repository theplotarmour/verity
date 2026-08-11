"use client";

import { useEffect } from "react";

/**
 * The cursor-following border glow, done once for the whole document.
 *
 * The obvious implementation — an `onMouseMove` on every card — puts twenty
 * React handlers on a dashboard, each firing on every pointer move, each
 * causing a state write or a style mutation. That is the version of this effect
 * that makes a cheap Android phone stutter, and this app is used on cheap
 * Android phones.
 *
 * Instead: one passive listener on the document, coalesced to one write per
 * animation frame, touching only the card currently under the pointer. The two
 * properties it writes (`--mx`, `--my`) are read by a compositor-only
 * `::before` — no layout, no paint of the card itself.
 *
 * Pointer-based, so it does not run at all on touch: `pointermove` from a
 * finger would light a card up during a scroll, which is noise rather than
 * feedback.
 */
export function CursorGlow() {
  useEffect(() => {
    // Respect the OS setting and skip the work entirely rather than animating
    // to zero — the cheapest effect is the one that never runs.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let pending: { card: HTMLElement; x: number; y: number } | null = null;
    let active: HTMLElement | null = null;

    function flush() {
      frame = 0;
      if (!pending) return;
      const { card, x, y } = pending;
      pending = null;

      if (active && active !== card) {
        active.removeAttribute("data-glow");
      }
      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
      card.setAttribute("data-glow", "on");
      active = card;
    }

    function onMove(event: PointerEvent) {
      // Mouse only. A finger dragging through a scroll would otherwise trail
      // lit cards behind it.
      if (event.pointerType !== "mouse") return;

      const card = (event.target as Element | null)?.closest<HTMLElement>(".verity-glass");

      if (!card) {
        if (active) {
          active.removeAttribute("data-glow");
          active = null;
        }
        pending = null;
        return;
      }

      const rect = card.getBoundingClientRect();
      pending = { card, x: event.clientX - rect.left, y: event.clientY - rect.top };

      // Coalesce: several moves inside one frame collapse to a single write.
      if (!frame) frame = requestAnimationFrame(flush);
    }

    function onLeave() {
      if (active) {
        active.removeAttribute("data-glow");
        active = null;
      }
      pending = null;
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
      if (active) active.removeAttribute("data-glow");
    };
  }, []);

  return null;
}
