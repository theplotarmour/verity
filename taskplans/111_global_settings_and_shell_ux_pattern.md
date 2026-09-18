# Task 111 — Global Settings/Appearance + shell UX pattern (structure, not color)

Authority: User synthesis, 2026-09-17, reference screenshots (Settings/Appearance page,
Home dashboard) — explicitly scoped by the user to structure/UX, not the shown brown/gold
palette. Palette stays governed by ADR-012 (`#00D1B2` default, ten presets + custom).
Material rules now governed by **ADR-024** (partially supersedes ADR-023, 2026-09-18 — see
Correction below).

## Status: PARTIALLY BUILT — material foundation only; the shell/settings IA this taskplan
actually asks for is NOT yet built. Full execution plan moved to Task 115.

**Correction, 2026-09-18.** Three things changed since this file was written:

1. **ADR-024 partially supersedes ADR-023's "solid everywhere" default** — structural chrome
   (sidebar, top bar, command palette, modals, dropdowns) is glass again; dense content
   (tables, forms, cards) stays solid exactly as ADR-023/this file's original intent
   described. See `verity-spec/17_decisions/adr/adr-024.md`.
2. **New reference screenshots, 2026-09-18** (Home dashboard, light + dark, blue accent —
   accent color is explicitly NOT the point per the user's own instruction, "focus on
   covering all kinds of UX" instead) refine this file's own Home dashboard IA description
   (Scope item 3 below) with concrete structural details that description didn't have: a
   `Create +` split-button top-right (new — not in the original scope text), a workspace-
   switcher card above the user's identity card at the sidebar foot (this file never
   specified that), icon-chip stat tiles with a `⋮` overflow control per tile, a chart-card
   with a hover tooltip showing both series' exact values, task rows with an inline priority
   pill + due-date column, and AI-assistant suggested-prompt chips as full-width rows rather
   than a plain text list.
3. **Direction target is now "Apple craft applied to this IA," not the reference screens'
   literal look** — per the user's explicit "we are completely shifting to apple design...
   just focus on cover all kinds of ux," grounded in the `apple-design` skill (WWDC
   "Designing Fluid Interfaces" / "Principles of Great Design"). This file's own IA (nav
   grouping, stat row, chart+activity split, quick actions) stays the target *structure*;
   **Task 115** is where the full Apple-craft execution plan (material, motion, typography,
   all governing-doc updates) lives — read it before building anything from this file.

**What is actually built vs. not**, corrected from this file's stale framing:
- Settings: a real global `/settings` index exists (`src/app/(shell)/settings/page.tsx`,
  built 2026-09-18 under Task 114's P1.5 item 9 work) — but it is a simple link list, NOT
  the left-nav-list + detail-pane + live-preview three-pane shell this file's "Scope" item 1
  describes. That three-pane shell is still unbuilt.
- Appearance: `AppearanceControls` (theme/accent/density/radius) exists and is reachable
  from `/settings` — but the shade-ramp preview (50–900) this file's "Scope" item 2 calls
  "new... nothing today visualizes" is still not built.
- Home dashboard IA (4-up stat row, chart+activity split, quick-actions grid, AI-assistant
  panel): **not built** for the platform-wide Home (`/`) at all. Outreach's own dashboard
  (`/outreach`) independently grew a similar-shaped three-layer IA through Task 114's P1
  work, but that is capability-local, not the shared shell pattern this file asks for.

## Trigger

Product owner reviewed two reference screenshots (a Settings > Appearance page, a Home
dashboard) and judged the **UX pattern** — not the specific colors — good enough to become
the platform default: every tenant, every tab, every page should reach this bar, not just
Outreach's current dark-glass dashboard (which this taskplan does not replace).

## Scope

**In scope** — codify as reusable Experience System pattern:
1. Settings shell: left nav list of setting groups (icon + label + one-line description),
   selected-state highlight, detail pane on the right, live-preview pane furthest right
   showing the shell + a sample card reacting to the change in real time.
2. Appearance controls specifically: theme (Light/Dark/System) as three equal cards with
   icon + label + description; accent swatches as a row of solid-color circles + a "Custom"
   swatch that opens a picker; a **shade-ramp preview** (50–900) once an accent is chosen —
   this is new, current `accent.ts` computes contrast but nothing today visualizes the full
   ramp back to the user; UI density as three cards (Comfortable/Compact/Spacious) each with
   a tiny visual glyph of the density, not just text; border-radius as a live slider with a
   numeric px readout.
3. Home dashboard IA: greeting + date line, a promo/CTA banner, a 4-up stat-card row (icon
   chip + label + big number + delta vs. prior period), a two-thirds/one-third split below
   (primary chart card + secondary list card), a three-across row below that (tasks-with-
   filter-chips, quick-actions grid, AI-assistant panel with suggested-prompt buttons).

**Out of scope**:
- The specific brown/gold/cream palette in the screenshots — superseded by ADR-012's
  `#00D1B2` default and preset system. Every color in this pattern must derive from
  `--accent-seed` + the brand-sheet neutrals, never be hand-picked per screenshot.
- Rebuilding Outreach's existing dark/glass dashboard shell — that one already exists, is
  built to ADR-011/012, and stays.
- Any capability-specific page content (Leads, Sales, Inventory, etc.) — this taskplan is
  the *shell and settings pattern* only, reusable by every future capability page per this
  repo's foundation principle, not a redesign of any one capability's data views.

## Open question — RESOLVED by ADR-023 (2026-09-17)

Originally flagged: the reference screenshots show mostly-opaque, solid cards, and it was
unclear whether that was ADR-011's existing forms/tables exemption (Settings page only) or
a signal for a broader platform-wide material change (interpretation 2, ADR-weight).

Resolved: the product owner, shown a fuller reference set (Settings/Appearance + Home
dashboard, both light and dark) and asked directly, chose interpretation 2 explicitly —
"forget glassmorphism... completely copy this design language" — and authorized amending
governing docs ("amend bible spec adr anything if needed"). `verity-adr-gate` was run;
**ADR-023** (`verity-spec/17_decisions/adr/adr-023.md`) now supersedes ADR-011's glass
hierarchy in full. Solid opaque cards are the platform-wide default for every surface, not
only Settings/forms. `CLAUDE.md`'s Experience System section and the
`verity-design-companion` skill are updated to match.

**Re-resolved in part by ADR-024 (2026-09-18).** "Solid everywhere" did not survive contact
with structural chrome (sidebar, top bar, modals, popovers) once the product owner's
direction shifted to Apple-craft chrome — glass is back for chrome specifically, solid stays
for dense content. See Task 115 for why and the full plan; this file's own Settings/Home IA
target is unaffected either way (it was always about layout, not the material question).

## Non-goals

- Not a new component library from scratch — reuse existing card/stat-tile primitives where
  they already conform (see Task 111's sibling extraction work, if run via `impeccable
  extract`); this taskplan defines the target shape, not the refactor mechanics.
- Not a client-specific skin. Whatever ships here must work unmodified for every tenant
  differing only by their chosen accent and theme.

## Next steps (unblocked now)

- Build the Settings/Appearance shell (nav list + detail pane + live preview) as a shared
  platform settings surface, using existing `accent.ts` contrast logic to drive the new
  shade-ramp preview, solid material throughout per ADR-023.
- Build/confirm the Home dashboard IA as the default shell layout other capability
  dashboards compose into, solid material per ADR-023 (no longer exemption-gated — this is
  now the default everywhere).
- Migrate existing glass-class usages (`.glass-shell`, `.glass-card`, `.glass-control`,
  `.glass-overlay`, incl. Outreach's current dashboard) to `.verity-solid` as those surfaces
  are next touched — ADR-023 does not mandate an immediate rip-and-replace pass, but no new
  glass usage should be added anywhere from this point forward.
