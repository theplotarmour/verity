# Verity UI Motion Architecture

*   **Date**: 2026-08-28 (revised 2026-08-29 — reconciled with `globals.css` and ADR-011's reduced-motion requirement)
*   **Target File**: `Verity_Motion_Architecture.md`
*   **Status**: Design reference for the upcoming UI/UX implementation phase. Nothing below is built yet except the existing `--ease-out` token.
*   **Frameworks**: `framer-motion` (already installed) for anything imperative; plain CSS transitions/Tailwind utilities for hover/focus micro-states that don't need JS. *Revision note: the original draft named "Motion Primitives" as a second library — it isn't installed and isn't needed; its patterns are achievable directly in `framer-motion`.*
*   **Core Principle**: Physics-coherent interaction — relevance, restraint, feedback.

---

## 0. Non-negotiable: reduced motion

`globals.css` already sets `transition-duration: 0.01ms !important` / `animation-duration: 0.01ms !important` under `prefers-reduced-motion: reduce` (ADR-011's reduced-transparency-and-motion requirement). Every animation built from this document must honor that:

*   CSS-driven transitions inherit it automatically — nothing to do.
*   `framer-motion` does **not** honor the media query on its own. Any `motion.div` with a JS-driven `animate`/`transition` must check `useReducedMotion()` from `framer-motion` and either skip the animation or collapse it to an instant, opacity-only change. This applies to every section below — it is not repeated per-component.

---

## 1. The Principle of Motion Restraint

Verity is a dense, high-end business application. Motion exists purely to convey hierarchy, maintain focus, and provide spatial transitions.

*   **No Playful Animation**: Never bounce, rotate, or shake UI elements unless displaying a critical error or action warning.
*   **Restrained Entry**: Entry animations do not trigger on every grid load. Dashboards load instantly; charts transition subtly on first mount only (track with a ref/state flag, not on every re-render).
*   **Physics-Coherent Speeds**: Small items move faster; large drawers or page panels move with slower, smoother momentum.

---

## 2. Standard Transition Values

`globals.css` already defines `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` — keep it as the default for ordinary hover/focus CSS transitions (buttons, inputs, links already use it). The tokens below are **additive**, for the specific interactions named, not a replacement of the existing token:

| Transition Name | Target Element Type | Duration (ms) | Easing Preset |
| :--- | :--- | :--- | :--- |
| **Instant** | Checkbox check, toggle clicks | `80ms` | `linear` |
| **Micro-Interaction** | Hover states, tab switches, button presses | `150ms` | `var(--ease-out)` (existing token — do not add a second one for the same job) |
| **Component Entry** | Popovers, tooltips, dropdown menus | `200ms` | `cubic-bezier(0.16, 1, 0.3, 1)` — new token, add as `--ease-entry` |
| **Container Slide** | Context panels, dialog overlays, bottom sheets | `250ms` | `cubic-bezier(0.32, 0.94, 0.6, 1)` — new token, add as `--ease-slide` |
| **Workflow Graph** | Panning/zoom focal shifts (only if a workflow-graph capability is ever built) | `300ms` | `cubic-bezier(0.25, 1, 0.5, 1)` — new token, add as `--ease-graph`, add only when that capability exists |

When implemented, add `--ease-entry` and `--ease-slide` to `globals.css` alongside the existing `--ease-out` rather than as component-local constants — one token source, not one per file. Don't add `--ease-graph` speculatively; nothing consumes it yet (Bible's "avoid speculative extension points" applies to tokens too).

---

## 3. Component Interaction Guidelines

### A. Context Slide-in Panel (Smart Table's detail panel — see `Verity_Component_Specification.md` §3.A)

*   **Behavior**: Clicking a row in the Smart Table slides a glass panel (ADR-011 elevated material, not an opaque card) in from the right viewport boundary.
*   **Motion**:
    *   *Entrance*: `duration: 250ms`, `ease: --ease-slide`, translate X from `100%` to `0%`.
    *   *Exit*: `duration: 200ms`, `ease-in` variant, translate X from `0%` to `100%`.
    *   *Focus State*: a soft scrim fades in over the main workspace (`bg-neutral-950/20` dark-mode equivalent, opacity `0%→100%` over `250ms`) — the workspace stays visible underneath, per the spec's "keeps the user's primary workspace visible" requirement.
*   Respect `useReducedMotion()` per §0 — collapse to an instant opacity fade with no translate when set.

### B. Command Center Overlay (`⌘K`) — **NOT YET BUILT**, target motion once it exists

*   *Entrance*: `duration: 200ms`, scale `95%→100%`, opacity `0%→100%`.
*   *Result-row switching*: rows do not animate in individually. A background pill uses `framer-motion`'s `layoutId` to slide between the active row, not the rows themselves.

### C. Dashboard Sparklines & Charts — **NOT YET BUILT**

*   Line/area charts draw via SVG dash-offset transition, `duration: 600ms`, `ease-out`.
*   Numeric tickers roll from the previous value, `~1s`, smooth deceleration — only on first mount per §1's restrained-entry rule, never on every re-render of a live-updating number.

### D. Mobile Bottom Sheets — **NOT YET BUILT**

*   Slide-up via spring physics (`stiffness: 300, damping: 30`), translate Y `100%→0%`.
*   Swipe-to-dismiss mapped to a drag handle.
*   Springs bypass `--ease-*` tokens by nature; still gated by `useReducedMotion()` (§0) — reduced-motion users get an instant appear/dismiss, not a slowed spring.
