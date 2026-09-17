/**
 * ADR-024 motion system — spring presets for framer-motion, matching the
 * `apple-design` skill's own table (WWDC "Designing Fluid Interfaces").
 * `framer-motion` is already a dependency; this is the first file that
 * turns it into an actual system rather than two one-off uses.
 *
 * Two presets only, by design — a spring is defined by damping (overshoot)
 * and response/duration (settle speed), not a case-by-case tune:
 *
 *   - `springDefault`  — critically damped, no overshoot (`bounce: 0`). The
 *     right choice for anything that appears/moves because of a click or a
 *     state change (menus, dropdowns, modals, tab switches) rather than a
 *     drag the user is actively holding.
 *   - `springMomentum` — slightly under-damped, a little overshoot. Reserve
 *     this for genuinely gesture-driven interactions (a dragged sheet, a
 *     flicked card) — overshoot on something that just faded in reads as a
 *     mistake, not craft, per the skill's own "overshoot on a menu that
 *     just faded in feels wrong" rule.
 *
 * Respect `prefers-reduced-motion` at the call site: swap to a plain
 * opacity cross-fade rather than passing a reduced spring — reduced motion
 * means a *different* transition, not a smaller version of the same one.
 */
import type { Transition } from "framer-motion";

export const springDefault: Transition = {
  type: "spring",
  duration: 0.35,
  bounce: 0,
};

export const springMomentum: Transition = {
  type: "spring",
  duration: 0.35,
  bounce: 0.2,
};

/** Cross-fade for `prefers-reduced-motion: reduce` — no scale, no spring. */
export const reducedMotionFade: Transition = {
  type: "tween",
  duration: 0.15,
  ease: "linear",
};

/**
 * Reads the media query once, client-side only. Callers wrap their own
 * spring choice: `usePrefersReducedMotion() ? reducedMotionFade :
 * springDefault`.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
