# Verity UI Component Architecture & Design System Specification

*   **Date**: 2026-08-28 (revised 2026-08-29 — reconciled with Verity Bible / ADR-011 / ADR-012)
*   **Target File**: `Verity_Component_Specification.md`
*   **Status**: Design reference for the upcoming UI/UX implementation phase. Not yet built — see `NOT YET BUILT` markers below. Authority for anything that conflicts with an accepted ADR is the ADR, not this document.
*   **Design Paradigm**: Linear × Raycast × Vercel premium restraint, expressed through Verity's own material system (ADR-011) rather than a flat monochrome one.
*   **Accent Color**: `#00D1B2` (Verity Mint, default preset) — Authority: ADR-012. Configurable per tenant; never hard-coded in a component.

---

## 1. Verity Design Language Rules

Verity is a premium operating system for production and service enterprise workspaces. It rejects generic "SaaS card grids" in favor of strict, high-end visual utility — expressed through controlled glass, not through flattening.

### A. Color & Typography

*   **Typography**: **Inter** (Thin/Light/Regular/Medium), `--font-inter` in `globals.css`. Authority: ADR-012 (brand sheet is palette/type authority). *Revision note: the original draft proposed Satoshi/Geist Sans — superseded, conflicts with the accepted brand sheet. Do not adopt.*
*   **Base surfaces**: Neutrals from the brand sheet (`#F7F8FA` · `#0F1115` · `#1C1F24` · `#2A2E33` · `#E6E8EB`), not an invented `#09090B`/`#18181B` pair — Authority: ADR-012.
*   **Accent Controls**: The accent is reserved for active navigation markers, selection cues, and primary interactive states — never decorative. Ten approved presets plus custom hex, default Verity Mint. Never hard-coded into a component; always derived through `--accent-seed` / `color-mix` (ADR-012).
*   **Semantic Color Guard**: Green (success), Amber (warning), Red (danger), Blue (info) are semantic only. With a teal accent, this separation is load-bearing — success must not read as "the accent," so it is tuned to a distinct hue (ADR-012).

### B. Geometry & Shadows

*   **Borders**: 1px low-contrast hairlines (`border-line` / `border-line-strong`).
*   **Radii**: Use the platform's existing token scale — do not invent a parallel one:
    *   `--radius-xs` (6px) — small controls, checkboxes
    *   `--radius-sm` (9px) — dense inline elements
    *   `--radius-md` (11px) — buttons, inputs
    *   `--radius-lg` (14px) — cards, panels
    *   `--radius-xl` (17px) — modals, large workspace blocks
    *   `--radius-pill` (999px) — pills, badges
    *   *Revision note: the original 8/12/16/20px scale does not exist in `globals.css` and is not adopted — it would fork the token system rather than extend it.*
*   **Shadows**: Soft, near-invisible ambient diffusion on **solid** surfaces (dense tables, forms, destructive confirmation — ADR-011 mandates these stay opaque). On glass surfaces, depth comes from the material's own highlight/blur, not from a stacked shadow.

### C. Material — glass is not optional

*   **ADR-011 governs.** Persistent surfaces (shell, cards at the "elevated" level, dropdowns, popovers) use structural glass — bounded by composited-contrast AA, capped blur layers, hierarchy-first application, light/dark parity, and honoring reduced-transparency. Dense tables, long-form text, high-density forms, semantic status, and destructive confirmation stay solid, by the same ADR.
*   *Revision note: the original draft's "near-invisible ambient diffusion, no heavy shadows" language described a flat design with no glass at all. That is the anti-pattern ADR-011 names explicitly ("do not flatten glass into opaque cards without a stated reason," "do not turn the shell into generic SaaS"). Any component built from this spec keeps the shell's existing glass classes (`glass-card`, `glass-control`, `glass-overlay`) — it does not replace them with flat opaque panels.*

---

## 2. Component Sourcing

**NOT YET BUILT / NOT YET INSTALLED.** Every library below is a candidate, installed only when a component that actually needs it is being built — not pre-installed as an "ecosystem." As of 2026-08-29, `framer-motion` is the only one of these already in `package.json`.

| System Role | Candidate Source | Install When |
| :--- | :--- | :--- |
| **Foundation & Behavior** | Radix UI primitives | Building a component needing accessible headless behavior (menu, dialog, popover) that `src/components/ui/primitives.tsx` doesn't already cover. |
| **Data grid** | `@tanstack/react-table` | Building the Smart Table (§3.A). |
| **Interactive Transitions** | `framer-motion` (already installed) | Any entrance/exit/drawer transition — see `Verity_Motion_Architecture.md`. |
| **Charts** | Recharts, or hand-rolled SVG (existing pattern in the platform) | Only if the existing sparkline/typographic-metric approach (§3.E) is insufficient. |

*Revision note: the original draft named Base UI, Origin UI, Kokonut UI, Magic UI, React Bits, Motion Primitives, Aceternity, and Cult UI as a curated multi-library ecosystem. None of these are installed, none have been evaluated against the platform's security/license/maintenance bar, and stacking eight component sources works against `globals.css`'s single material system. Treat the table above as the actual candidate list; do not install from the original ecosystem diagram without a separate decision per library.*

---

## 3. Custom Verity Signature Components

Design targets for the implementation phase. None are built yet.

### A. The Smart Table (TanStack Table + Context Panel) — **NOT YET BUILT**

Replaces/extends the existing `src/components/ui/DataTable.tsx` (which today opens a row via a `Link` on the identity column — see its own doc comment for why the trailing "Actions" column was deliberately removed). The Context Panel is new behavior, not present today:

*   **TanStack Headless Core**: Sorting, pagination, multi-column filters — `DataTable.tsx` currently implements this by hand; TanStack replaces the hand-rolled logic, not the visual language.
*   **Context Panel Insertion**: Clicking a row slides a detail panel in from the right edge (glass, per ADR-011's elevated-surface treatment) instead of navigating away. Motion: `Container Slide` token, `Verity_Motion_Architecture.md` §3.A.
*   Existing five call sites (`(shell)/page.tsx`, `locations`, `evidence`, `audit`, `assets`) migrate one at a time, not in one pass — each has to decide whether "open this row" still means navigation or now means "open the panel."

```
┌───────────────────────────────────────┬──────────────┐
│  Smart Table                          │ Detail Panel │
│  Sharma Industries  28  ₹8.42L        │ ──────────── │
│  ABC Manufacturing  19  ₹5.12L        │ Overview     │
│  Kapoor Traders      7  ₹82K          │ Active Orders│
└───────────────────────────────────────┴──────────────┘
```

### B. The Universal Verity Object Card — **NOT YET BUILT**

Every core entity conforms to one layout: object header (context actions, status badge, key metrics) + tabbed deck (Overview/Orders/Invoices/Timeline) with no page reload between tabs.

### C. The CommandSurface (`⌘K`) — **NOT YET BUILT**

Fuzzy search across client directories, orders, settings, workflows. Natural-language action parsing (`Create order for Sharma` → pre-populated form sheet) is a stretch goal, not a first pass.

### D. The Dynamic Command Bar — **NOT YET BUILT**

Floating, context-aware command bar docked at the bottom of a data grid, replacing clustered toolbar buttons.

```
┌────────────────────────────────────────────────────────┐
│ [Create]   [Filter]   [Export]   [Suspend]              │
└────────────────────────────────────────────────────────┘
```

### E. Typographic Analytics — **PARTIALLY EXISTS**

Text-heavy metric + sparkline pattern, à la:

```
REVENUE
₹12.84L  ↑ 18.2% vs prev month
[━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]
```

`Stat`/`StatRow` in `primitives.tsx` already cover the plain-metric half; the sparkline and the animated counter are new.

---

## 4. Platform Component Structure

**Do not create `/packages/ui`.** Authority: this project's `CLAUDE.md` repository-structure section — a monorepo package split is a foundation restructure and was never decided. Everything below lives inside the existing flat tree:

```
src/components/ui/
├── primitives.tsx        # Button, Input, Select, Checkbox, Field, Panel, Badge, StateBadge... (existing)
├── icons.tsx              # (existing)
├── DataTable.tsx           # (existing — becomes the Smart Table's predecessor, not a separate parallel component)
├── primitives/             # NEW — split out of primitives.tsx only if/when it outgrows one file
├── business/                # NEW — CustomerCard-equivalents, the Universal Object Card, etc.
```

`src/components/shell/` keeps owning navigation chrome (`ShellChrome`, `HqChrome`) — it is not renamed or moved for this phase.
