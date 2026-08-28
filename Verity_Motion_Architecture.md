# Verity UI Motion Architecture

*   **Date**: 2026-08-28
*   **Target File**: `Verity_Motion_Architecture.md`
*   **Frameworks**: Framer Motion (Tailwind v4 transition utilities) + Motion Primitives
*   **Core Principle**: Physics-Coherent Interaction (relevance, restraint, and feedback).

---

## 1. The Principle of Motion Restraint

Verity is a dense, high-end business application. Motion exists purely to convey hierarchy, maintain focus, and provide spatial transitions.
*   **No Playful Animation**: Never bounce, rotate, or shake UI elements unless displaying a critical error or action warning.
*   **Restrained Entry**: Prevent entry-animations from triggering on every grid load. Dashboards should load instantly; charts transition subtly on the first load only.
*   **Physics-Coherent Speeds**: Moving elements must behave with simulated weight. Small items move faster; large drawers or page panels move with slow, smooth momentum.

---

## 2. Standard Transition Values

We establish a standardized set of animation duration and easing tokens across the Tailwind configuration:

| Transition Name | Target Element Type | Duration (ms) | Easing Preset |
| :--- | :--- | :--- | :--- |
| **Instant** | Checkbox check, toggle clicks | `80ms` | `linear` |
| **Micro-Interaction** | Hover states, tab switches, button presses | `150ms` | `ease-out` |
| **Component Entry** | Popovers, tooltips, dropdown menus | `200ms` | `cubic-bezier(0.16, 1, 0.3, 1)` (Out-Expo) |
| **Container Slide** | Context panels, dialog overlays, bottom sheets | `250ms` | `cubic-bezier(0.32, 0.94, 0.6, 1)` (Out-Quart) |
| **Workflow Graph** | React Flow panning, zoom focal shifts | `300ms` | `cubic-bezier(0.25, 1, 0.5, 1)` (Out-Quad) |

---

## 3. Component Interaction Guidelines

### A. Context Slide-in Drawer (Radix / Motion Primitives)
*   **Behavior**: When a row in the Smart Table is clicked, the `ContextPanel` slides in from the right viewport boundary.
*   **Motion**:
    *   *Entrance*: `duration: 250ms`, `ease: Out-Quart`, translate X from `100%` to `0%`.
    *   *Exit*: `duration: 200ms`, `ease: In-Quad`, translate X from `0%` to `100%`.
    *   *Focus State*: A very soft shadow overlay fades in over the main workspace (`bg-neutral-950/20` in dark mode, opacity `0%` to `100%` over `250ms`).

### B. Command Center Overlay (`⌘K`)
*   **Behavior**: Toggling `⌘K` opens a center dialog overlay.
*   **Motion**:
    *   *Entrance*: `duration: 200ms`, scale from `95%` to `100%`, fade opacity from `0%` to `100%`.
    *   *Fuzzy Search Filters*: Search result rows do not animate in one by one. The list updates instantly, but switching active rows shifts a background pill using layout animations (`layoutId` in Framer Motion) to slide smoothly between items.

### C. Dashboard Sparklines & Charts (Magic UI / Recharts)
*   **Behavior**: Sparklines and charts render subtle entry animations when the dashboard mounting completes.
*   **Motion**:
    *   Line/Area charts draw using SVG dash-offset transition (`duration: 600ms`, `ease: ease-out`).
    *   Numbers in typographic metrics use a numerical ticker (`Magic UI Number Ticker`) to roll values (e.g., counting up from `₹0` to `₹12,84,000` over `1s` with a smooth deceleration).

### D. Mobile Bottom Sheets
*   **Behavior**: On mobile viewports, center dialogs are replaced with bottom sheets sliding up.
*   **Motion**:
    *   *Slide-up*: Translate Y from `100%` to `0%` using a spring physics resolver (`stiffness: 300, damping: 30`). Supports swipe-to-dismiss gestures mapped directly to drag indicators.
