"use client";

import * as React from "react";

export type AnchorRect = {
  top: number;
  bottom: number;
  left: number;
  width: number;
};

export type DropdownPlacement = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "below" | "above";
};

/** Below this a list is more frustrating than no list, so we flip instead. */
const MIN_USEFUL_HEIGHT = 120;
const GAP = 4;

/**
 * Where to draw an open dropdown, in viewport coordinates.
 *
 * Split out from the components so the decision is testable without a DOM: a
 * dropdown near the bottom of the screen has to open upward, and one in a
 * short viewport has to shrink rather than run off the edge. Both were wrong
 * before, in every dropdown in the app at once.
 */
export function computeDropdownPlacement(
  anchor: AnchorRect,
  viewportHeight: number,
  desiredHeight: number,
  gap: number = GAP
): DropdownPlacement {
  const spaceBelow = viewportHeight - anchor.bottom - gap;
  const spaceAbove = anchor.top - gap;

  // Prefer below — that is what a reader expects — and only flip when below is
  // genuinely unusable and above is better.
  const flip = spaceBelow < Math.min(desiredHeight, MIN_USEFUL_HEIGHT) && spaceAbove > spaceBelow;

  const available = Math.max(flip ? spaceAbove : spaceBelow, MIN_USEFUL_HEIGHT);
  const maxHeight = Math.min(desiredHeight, available);

  return {
    top: flip ? anchor.top - gap - maxHeight : anchor.bottom + gap,
    left: anchor.left,
    width: anchor.width,
    maxHeight,
    placement: flip ? "above" : "below",
  };
}

/**
 * Track an anchor element and produce fixed-position styles for its dropdown.
 *
 * Fixed positioning is the point: an absolutely positioned list is clipped by
 * any scrolling ancestor, and the studio is built out of them. Recomputing on
 * scroll and resize keeps the list attached while the page moves under it.
 */
export function useDropdownPosition<T extends HTMLElement>(
  open: boolean,
  desiredHeight = 256
) {
  const anchorRef = React.useRef<T>(null);
  const [placement, setPlacement] = React.useState<DropdownPlacement | null>(null);

  React.useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }

    const measure = () => {
      const node = anchorRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setPlacement(
        computeDropdownPlacement(
          { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
          window.innerHeight,
          desiredHeight
        )
      );
    };

    measure();
    // Capture phase so a scroll inside any ancestor is seen, not just the page.
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, desiredHeight]);

  const style: React.CSSProperties | undefined = placement
    ? {
        position: "fixed",
        top: placement.top,
        left: placement.left,
        width: placement.width,
        maxHeight: placement.maxHeight,
      }
    : undefined;

  return { anchorRef, style, placement };
}
