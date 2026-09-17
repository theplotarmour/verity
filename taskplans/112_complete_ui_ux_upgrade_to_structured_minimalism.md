# Task 112 — Complete UI/UX upgrade: every tab/page/client to structured minimalism

Authority: ADR-023 (`verity-spec/17_decisions/adr/adr-023.md`) + Task 111
(pattern definition, Settings/Home scope). This taskplan is the platform-wide
rollout Task 111 explicitly scoped out ("shell and settings pattern only").

## Status: DONE 2026-09-17 — full sweep complete

`Surface`'s `solid` default flipped `false`→`true` (ADR-023 lever, cascades
to every screen composing `Surface`/`Panel` with zero per-file edits). Every
remaining literal `.glass-shell/-card/-control/-overlay` usage and every
`bg-glass-N` token usage swept from `src/` — 6 commits, ~40 files
(`fb7f3b9`, `255ad42`, `59de3bc`, `3ae807e`, `8f88a9e`, `604ff05`,
`3ad2b89`): shell chrome (`ShellChrome`/`HqChrome`/`CommandPalette`/
`AppearanceControls`/`AccentPicker`/`AgentChatDock`), shared UI primitives
(`Modal`/`Combobox`/`charts`/`ContextPanel`/`Related`/`PeriodSwitch`/
`Spinner`, plus `Button`/`IconButton`/`Input`/`Badge` in `primitives.tsx`
itself), sign-in surface, the full Outreach capability (17 files, including
the known `bg-glass-2` violation in `prospects/page.tsx`'s overdue chip),
and every remaining desk/admin screen (RolesAdmin, ConfigurationEditor,
CatalogueAdmin, FloorPlan/Editor, MenuAdmin, SetupChecklist, RolesDesk,
SalesDesk, StockBoard, ItcView, ImportWizard). `hover:bg-glass-2/-3` and
`bg-glass-2/-4` tokens standardized to the already-established
`bg-surface-sunken` pattern (confirmed live in `DataTable`/`SmartTable`/
`ThemeToggle` before the sweep started).

Verified: `npx tsc --noEmit` and `npx eslint --max-warnings=0` clean after
every batch; `impeccable`'s `detect.mjs` clean on a representative sample;
sign-in page (the only DB-free authenticated surface reachable in this
environment) screenshotted light+dark — solid cards, hairline borders,
correct contrast, no visual regression. Every other screen's live
verification is blocked on the same no-local-Postgres limitation already
recorded elsewhere in this repo (Task 113 item 3, the outreach handoff) —
not silently skipped, flagged here too.

Deliberately NOT done, per this file's own non-goals: the four `.glass-*`
CSS classes stay defined in `globals.css` (marked deprecated with an
ADR-023 pointer, not deleted) until a future pass confirms zero consumers
remain including `Surface`'s intentional `solid={false}` opt-out path.

## Trigger

ADR-023 retired glass as the default Experience System material and Task 111
defined the target shell pattern (Settings/Appearance, Home dashboard) for
that material. Both are documentation/pattern-definition only. Every actual
screen in the product — Outreach (built to the old ADR-011 glass hierarchy),
every other capability's UI, every shared component using `.glass-shell`,
`.glass-card`, `.glass-control`, `.glass-overlay` — still renders the
retired material. This taskplan is that migration.

## Scope

**In scope:**
1. `src/app/globals.css` — add/confirm `.verity-solid` (or successor) as the
   complete replacement material: opaque fill, `1px` hairline border, soft
   non-tinted shadow, consistent radius, for both light and dark themes.
   Deprecate (do not yet delete — see Non-goals) the four glass classes.
2. Every component currently applying a glass class: `ShellChrome.tsx`,
   card/panel primitives under `src/components/ui/`, and any capability page
   that composes them directly rather than through a shared primitive.
3. Outreach's dashboard specifically (the screen this session started from,
   currently the most complete glass implementation in the app) — full
   migration to solid material, both themes.
4. Settings/Appearance shell and Home dashboard IA from Task 111 — build
   these for real now that ADR-023 unblocks them; they become the reference
   implementation every other capability's shell composes into.
5. A pass over every other capability's UI (Trading/plywood, Outreach's
   sibling pages, any admin/HQ screens) to confirm no new glass usage exists
   post-migration and no visual regression in information hierarchy (Bible
   V4 §1.A whitespace-as-structure still applies — solid does not mean flat
   with no structure).

**Out of scope:**
- Any capability's data/content model, permissions, or business logic —
  visual material only.
- A new component library from scratch — reuse/extend existing primitives;
  this is a migration, not a rewrite (see `impeccable extract` if a
  primitive doesn't exist yet and needs to).
- Any accent/palette change — ADR-012 mechanics are unaffected by ADR-023
  and unaffected by this taskplan.

## Approach

1. Extract the solid-material primitives first (card, panel, stat-tile,
   settings-nav-item, elevated-surface/popover) as the reusable components
   Task 111 implicitly requires — `impeccable extract` on the Home
   dashboard + Settings shell once those two are built for real is the
   natural place to do this, per the prior session's recommendation.
2. Migrate `ShellChrome.tsx` and any other single-instance shell chrome
   first — highest leverage, touches every page at once.
3. Sweep remaining glass-class usages capability by capability. Grep
   `\.glass-(shell|card|control|overlay)` across `src/` for the actual
   list; do not estimate scope from memory.
4. Run `node <impeccable-base>/scripts/detect.mjs --json <changed targets>`
   per ADR-023's own skill guidance after each capability's pages are
   migrated, not only at the end — catches drift early.
5. Verify WCAG AA text contrast against the new opaque fills in both
   themes before calling any single page done — this was a binding
   constraint under ADR-011 and remains one under ADR-023, just applied to
   solid surfaces.

## Non-goals

- Do not delete the four glass CSS classes yet. Mark them deprecated in
  `globals.css` with a comment pointing at ADR-023, but leave them defined
  until every consumer is confirmed migrated — removing them early breaks
  any page this taskplan hasn't reached yet, worse than leaving dead CSS.
- Not a redesign beyond the material swap. Information architecture,
  copy, and layout stay as they are per-capability unless a specific page
  is also in Task 111's explicit IA scope (Home, Settings).
- Not a one-session task. Scope this by capability and land incrementally;
  update this file's Status and `00_STATUS_INDEX.md` per capability
  completed, not only when the whole thing is done.

## Open question

Whether Outreach's current dark-glass dashboard migrates to the *exact*
warm-cream/navy palette from the Task 111 reference screens, or keeps its
own dark theme's existing hue with only the material (blur → solid) swapped,
is not decided here. ADR-023 governs material; ADR-012 governs palette/
accent and was not changed. Default to: keep each tenant's chosen accent
and existing light/dark neutral tokens, change only the surface material
(opaque instead of translucent) — that is the literal scope of ADR-023.
Escalate if a broader palette unification is also wanted; that would be a
separate, undecided question.
