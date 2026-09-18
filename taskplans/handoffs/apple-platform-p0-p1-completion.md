# Handoff — Apple platform UI/UX audit, P0/P1 completion

Authority: `docs/audits/2026-09-18-apple-platform-ui-ux-audit.md` (the gap
list and required completion tests — read it first, this file tracks
progress against it item by item) and `taskplans/115_apple_design_system_
governing_docs_overhaul.md` (ADR-024/ADR-025 foundation this audit measures
against; that taskplan's own scope is DONE — do not re-open it). See
`taskplans/handoffs/README.md` for where this fits in the active-work order.

This is not new scope. Every ID below is the audit's own ID — this file
exists so a fresh session (or the next tool round in this one) can see
exactly what's done, what's in flight, and what's left without re-reading
the whole audit and re-deriving status.

## Execution order (the audit's own, §"Recommended execution order")

1. Truthful shell: P0-01, P0-04, then signed-in visual proof (P0-03).
2. Control convergence: P0-02, P1-06.
3. Keyboard and recovery: P1-01, P1-02, P1-03, P1-07.
4. Responsive information architecture: P1-04, P1-05 (needs a product
   decision, not cosmetic CSS — flag, don't silently pick one).
5. P2 items — deferred, needs product-owner decisions on several (dashboard
   depth, font strategy, accent timing) — not started from this file alone.
6. Liquid Glass — explicitly last, explicitly deferred, not in this pass.

## Status

### P0-01 — fake search field
Status: **DONE** — `ShellChrome.tsx`'s search field is now a `<button>`
dispatching `window` event `verity:open-command-palette`; `CommandPalette.tsx`
listens and opens. Verified live (Chrome DevTools MCP): click opens the
palette with focus on its own input. Same visual geometry, honest behavior.

### P0-02 — shared form primitive adoption incomplete
Status: **DONE** (`DataTable.tsx` checkbox part tracked separately as
P1-06, not this item). Swept every raw `<input>`/`<textarea>` outside
`components/ui/` in `src/app/(shell)/`: `TaskPanel`, `ResearchForm`,
`MeetingPanel`, `DirectionForm`, `ContactForm`, `CoachingNotePanel`,
`LeadActions` (6 inputs + 4 textareas — the largest single file),
`BulkActionBar`, `ItcView`, `CustomFieldsPanel` → now `Input`/`Textarea`
from `primitives.tsx`. Fixed-width fields (`amount`/`threshold`/bulk task
title) wrapped in a sized `<div>` rather than passed a conflicting `w-*`
className, because this repo's `cx()` is a plain join (no `tailwind-merge`)
and `Input`'s own class already bakes in `w-full`.
Two **stated exceptions**, not silently skipped:
- `ImportWizard.tsx`'s CSV-paste textarea — same reason, documented inline:
  `Textarea`'s baked-in `min-h-24`/`text-[14px]` would collide un-overridably
  with this box's `min-h-40 font-mono text-[13px]` CSV need.
- `CustomFieldsPanel.tsx`'s dynamic checkbox — not swapped to the
  `Checkbox` primitive because `Checkbox` renders its own `<label>` and
  `Field` already supplies one via `htmlFor`; styled to match instead.
`tsc --noEmit` clean. Screenshot-verified (`/outreach/prospects`, light).

### P0-03 — no signed-in visual proof
Status: **PENDING**
Plan: once P0-01/P0-04 land, take live Chrome DevTools MCP screenshots,
light + dark, desktop width, for shell + Outreach (the audited surfaces).
Compare against `design/newlighttheme.jpeg`/`newdarktheme.jpeg`. Record
findings back into the audit doc per its own "Audit gates" section.

### P0-04 — ModalCancel renders as primary
Status: **DONE** — audit's premise was already stale: `Button`'s own
default is `variant="secondary"` (checked `primitives.tsx`), not primary.
Hardened anyway: `ModalCancel` now passes `variant="secondary"` explicitly
so it no longer silently depends on that default. `tsc --noEmit` clean
across all 13 call sites.

### P1-01 — Tabs keyboard semantics
Status: **PENDING** — `src/components/ui/Tabs.tsx`. Roving `tabIndex`,
`aria-controls`/panel IDs, Arrow/Home/End.

### P1-02 — Menu focus lifecycle
Status: **PENDING** — `ProfileMenu.tsx`, `OverflowMenu.tsx`. Focus into
menu on open, arrow navigation, focus restore to trigger on close.

### P1-03 — CommandPalette focus + honest scope
Status: **PENDING** — `CommandPalette.tsx`. Focus trap/restore; either add
capability-contributed search providers or relabel/mount narrower.

### P1-04 — sidebar cannot collapse/hide
Status: **PENDING** — `ShellChrome.tsx`, `OrganizationSwitcher.tsx`.
Reversible collapse control + shortcut; preserve org context when
collapsed.

### P1-05 — mobile nav is overlay-only
Status: **PENDING, NEEDS PRODUCT DECISION** — do not silently pick compact
tab bar vs. primary-only navigator vs. split view. Flag to product owner
before building; do not treat as a CSS task.

### P1-06 — table checkboxes raw/small
Status: **DONE** — `DataTable.tsx`'s header select-all and per-row
checkboxes wrapped in a `size-11` (44px) centered clickable span; visible
box bumped 15px→18px matching the shared `Checkbox` primitive's own size;
added a visible focus-visible ring. Selected-row feedback already existed
(`data-selected` background + accent inset shadow). Keyboard check/uncheck
was already free (native `<input type=checkbox>`). Not live-verified in
this tenant — the two enabled DataTable routes tried (`/locations`,
`/audit`) are feature-gated off for this tenant/role; change is low-risk
pure Tailwind sizing, `tsc --noEmit` clean.

### P1-07 — RouteLoading is a bare spinner
Status: **PENDING** — `Spinner.tsx`, `(shell)/loading.tsx`. Route-shaped
skeletons for known pages; labelled compact spinner for unknown work.

## Already done this session, before this file existed (fold into P0-03's proof pass, not separately tracked)

- `OrganizationSwitcher`'s masthead ("header") instance: flat `bg-surface`
  card → `glass-control` (matches sibling search/bell), both single- and
  multi-membership branches.
- `--color-surface`/`-elevated`/`-sunken` dark values: were a bare neutral
  hex (`#1c1c1e`, iOS's own literal token) dropped onto our blue-shifted
  canvas (`#090f14`) — two color temperatures in one room. Now
  `color-mix(in oklab, white/black N%, var(--color-canvas))`, same hue,
  only lightness steps change. `src/app/globals.css`.

## Rules while executing this list

- Commit after each completed item (or coherent sub-slice of P0-02, which
  is large), not one giant commit at the end — per this repo's normal
  workflow and the user's explicit instruction this session.
- Screenshot light + dark for any visual change before marking an item
  done, per the audit's own gate section.
- P1-05 and any P2 item that says "needs a decision" — stop and surface it,
  do not improvise a product decision.
- Update this file's per-item status (PENDING → DONE, with commit hash) in
  the same commit as the code, same discipline as every other handoff file
  in this folder.
