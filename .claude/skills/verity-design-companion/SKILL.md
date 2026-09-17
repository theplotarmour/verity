---
name: verity-design-companion
description: Use alongside `impeccable` for any Verity frontend work — before or during writing/changing UI, pass this skill's Verity-specific palette/material/token constraints (ADR-012/023) as structured input rather than relying on memory of CLAUDE.md prose. Trigger whenever `impeccable` is invoked in this repo, or whenever a change touches accent colors, card/panel surfaces, typography, or the monochrome mark.
license: Apache 2.0
---

Authority: `taskplans/99_verity_custom_skills_plan.md` Skill 8. `impeccable`
is deliberately generic across projects. Verity's Experience System
(ADR-012/023) is real, specific, and currently lives only in `CLAUDE.md`
prose — this skill hands `impeccable` those constraints as a checklist so
a frontend change doesn't drift off-token by relying on the model having
read and remembered the right paragraph.

**ADR-023 (2026-09-17) retired glass as the default material.** If you
remember this skill from before that date, the glass-hierarchy section
below is gone — re-read this file, don't work from memory.

## The constraints, as structured input

**Accent (configurable, ADR-012):** ten approved presets — Verity Mint
`#00D1B2` (default), Warm Sand Gold `#D4A017`, Champagne, Ocean Blue,
Slate Blue, Indigo, Violet, Emerald, Rose, Graphite — plus custom hex.
Never hard-code an accent value into a component; everything derives from
`--accent-seed` through `color-mix` in `globals.css`. Contrast against the
accent is computed (`src/server/platform/accent.ts`), never assumed —
white does not work on every preset.

**Mark (fixed, ADR-012):** the Verity mark is monochrome everywhere,
including the favicon and app icon. It is never recolored by the accent.
This is the one thing in the system that is NOT theme-configurable —
check any new surface that renders the mark against this before shipping.

**Semantic colors (independent of accent, ADR-012):** success/warning/
danger are their own hues (success specifically retuned to a leaf green,
deliberately not the accent hue) so status and theme never read as one
signal. Never let a status color equal the current accent by coincidence
of a particular preset — check against more than one preset if unsure.

**Neutrals and type (brand sheet is the authority, ADR-012):**
`#F7F8FA` / `#0F1115` / `#1C1F24` / `#2A2E33` / `#E6E8EB`; Inter (Thin /
Light / Regular / Medium); icons are thin outline. `design/verity
asthetics.png` is the palette authority — check it directly for anything
this list doesn't cover, never invent a brand color.

**Material (structured minimalism, ADR-023 — one material, no glass):**
Every card, panel, and elevated surface uses `.verity-solid` (or its
direct successor class): fully opaque fill, `1px` hairline border, soft
ambient shadow, consistent corner radius. No `backdrop-filter`, no
translucency, no layered tint gradient anywhere — `.glass-shell`,
`.glass-card`, `.glass-control`, `.glass-overlay` are deprecated; do not
add new usages, and treat any surviving usage found while editing a file
as a signal to migrate it, not to match it. Depth comes from three levers
only: tonal contrast between page background and card fill, the hairline
border, and shadow — never blur. Reference shape observed directly from
the product-owner screens: light theme uses a warm cream/tan page
background (`#F7F8FA`-family, warmer than pure gray) with white/cream
cards; dark theme uses a near-black navy page background (`~#0F1115`)
with a slightly lighter navy card fill — same hairline-plus-shadow
structure in both, never a glow or a colored halo. Text contrast against
the solid fill must meet WCAG AA — this constraint is unchanged from
ADR-011, just applied to opaque surfaces instead of composited ones.

**Light/dark:** two material interpretations of one system, not two
designs — a change to one surface's light-mode treatment needs its
dark-mode counterpart considered in the same pass, not as a follow-up.

## Procedure

1. Before writing or changing any Verity UI, run through the constraints
   above against the specific surface being touched — solid material
   correctly applied (no stray glass class), does it touch the accent or
   a semantic color, does it render the mark.
2. Hand `impeccable` this as explicit input (not just "follow CLAUDE.md")
   when invoking it for Verity work, so its general design judgment
   operates within these specific bounds rather than defaulting to
   whatever a generic project would use.
3. Check the anti-regression list in `CLAUDE.md`'s Experience System
   section before finishing — it names the specific failure modes already
   seen once (reintroducing blur/backdrop-filter without a new ADR,
   hard-coding an accent, recoloring the mark, collapsing success into the
   accent hue, reintroducing scarlet, generic-SaaS drift with no material
   point of view).

## Non-goals

- Not a replacement for `impeccable` — this supplies Verity-specific
  facts; `impeccable` still supplies general design judgment and craft.
- Not a mandate to re-litigate ADR-012/023 — where this skill and a new
  idea conflict, the ADRs win; propose a new ADR if the conflict is a
  genuine improvement, don't just override in one component.
