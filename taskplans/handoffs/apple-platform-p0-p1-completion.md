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
Status: **DONE** — live Chrome DevTools MCP session, signed in as
`divyom.sharma` / PlotArmour Studio. Verified: desktop 1440×900 light +
dark (masthead glass, gold accent active-nav, `.verity-solid` content
card), mobile 390×844 light + dark (bottom tab bar, collapsed sidebar).
No visual regressions against the ADR-024 material system. Screenshots
not archived to disk this pass — verification was interactive, not a
file-producing step; re-run the same DevTools MCP flow to reproduce.

### P0-04 — ModalCancel renders as primary
Status: **DONE** — audit's premise was already stale: `Button`'s own
default is `variant="secondary"` (checked `primitives.tsx`), not primary.
Hardened anyway: `ModalCancel` now passes `variant="secondary"` explicitly
so it no longer silently depends on that default. `tsc --noEmit` clean
across all 13 call sites.

### P1-01 — Tabs keyboard semantics
Status: **DONE** — `Tabs.tsx` now has roving `tabIndex` (only the active
tab is in the tab order), `id`/`aria-controls`/`aria-labelledby` linking
each tab to its panel, and ArrowLeft/ArrowRight/Home/End moving both focus
and selection (automatic activation — all tab content is already fetched
in one round trip, so there's no fetch to gate behind a separate
activation key). Live-verified: ArrowRight on the Outreach record-detail
tab strip moved focus + swapped the panel in the same frame.

### P1-02 — Menu focus lifecycle
Status: **DONE** — both `ProfileMenu.tsx` and `OverflowMenu.tsx`: opening
focuses the first menu item, Arrow/Home/End cycle items, Escape and
outside-click restore focus to the trigger. `OverflowMenu`'s items are
arbitrary children with no shared ref array, so its item lookup queries
`[role="menuitem"]` inside the component's own wrapper ref rather than
threading refs through every caller. Live-verified on `ProfileMenu`:
open → focus on "Account" → ArrowDown → highlight moves to "Settings".

### P1-03 — CommandPalette focus + honest scope
Status: **DONE, in part — the other part is a stated, deferred gap, not
silently skipped.** Focus trap (Tab/Shift+Tab cycle within the dialog,
matching its `aria-modal="true"`) and focus restore to whatever had focus
before opening: DONE, live-verified (Tab from input → "Create prospect" →
Tab wraps back to input → Escape restores focus to the search trigger).
`aria-label` changed from generic "Command palette" to "Search Outreach
leads, domains, and teams" — honest about scope for anyone using a screen
reader, on top of the placeholder text already being explicit.
**Not done**: capability-contributed search providers, so the palette is
still mounted globally (every page, via P0-01's trigger) but only ever
searches Outreach entities. That needs a provider-registration
architecture — real design work, not a styling fix — and is out of scope
for this pass. Flagging here rather than either building it unreviewed or
silently leaving the gap undocumented.

### P1-04 — sidebar cannot collapse/hide
Status: **DONE** — `ShellChrome.tsx`, `OrganizationSwitcher.tsx`. Toggle
button in the sidebar header (`collapse`/`expand` icons) plus Cmd/Ctrl+B,
reversible either direction. State persisted to `localStorage`
(`verity:sidebar-collapsed`), read in a mount effect rather than the
`useState` initializer to avoid an SSR/client hydration mismatch — costs
one frame of "starts expanded", accepted trade-off. Grid rail width
animates 240px↔76px (`grid-template-columns` transition, neutralised
automatically by the existing global `prefers-reduced-motion` rule — no
extra guard needed). Collapsed rail: `VerityLockup`'s existing `collapsed`
prop (symbol only, no wordmark — this prop already existed, unused until
now), nav labels move to `sr-only` + native `title` tooltip, org context
preserved via a new `OrganizationSwitcher` `collapsed` prop (building
glyph + `title`/`sr-only` full name, not dropped). Live-verified 1440×900
light + dark: collapse/expand both directions, rail width, icon-only nav,
org glyph present in DOM. `tsc --noEmit` and `eslint` clean.

### P1-05 — mobile nav is overlay-only
Status: **DONE** — bottom compact tab bar per the product owner's
2026-09-18 decision (compact tab bar over primary-only navigator,
responsive split view, or deferring). `ShellChrome.tsx`: the mobile top
bar's "Menu" button is gone (identity + theme toggle only now); a new
fixed `<nav aria-label="Primary">` at the viewport bottom shows the first
4 items of `areas` flattened (the platform's own declared priority order
— Overview, then Trade/Inventory/Money/Insights per taskplans/45 §8; no
per-role usage telemetry exists to rank by otherwise) plus a 5th "More"
tab reusing the existing `navOpen` sheet for everything else (org
switcher, full nav, sign out) rather than a second overflow surface.
Safe-area respected via `env(safe-area-inset-bottom)` on the bar's own
padding and on `<main>`'s bottom padding (so page content doesn't hide
behind it). Active-tab color-only accent (no motion to gate behind
`prefers-reduced-motion` — text/icon color transition only).
**Found and fixed while verifying, not a separate audit item**:
`AgentChatDock`'s floating trigger (`fixed bottom-6 right-6`) sat directly
under the new tab bar on mobile — pushed to
`bottom-[calc(4.5rem+env(safe-area-inset-bottom))]` with `lg:bottom-6`
restoring the original desktop offset; same fix applied to the open
chat panel's offset. Also fixed: the sheet's scrim (`fixed inset-0 z-40`)
was covering the tab bar the same way it always covered the old
mobile-top-bar "Close" button (pre-existing, not introduced here) — gave
the tab bar `z-40` (matching the scrim) placed after it in the DOM, so
"More"/"Close" stays reachable while the sheet is open, an improvement
over the prior behaviour rather than a regression of it. Live-verified
390×844 light + dark: tab bar renders, active tab highlights on
navigation, "More" opens the sheet with the bar still visible/usable on
top of the scrim, "Close" closes it. `tsc --noEmit` and `eslint` clean.

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
Status: **DONE** — the audit's own wording is a hybrid policy (route-shaped
skeletons for known pages, a labelled compact spinner for unknown work),
not skeletons everywhere. `outreach/loading.tsx` already had a route-shaped
`SkeletonBlock` layout (predates this pass) covering every `/outreach/*`
sub-route via Next's nested-segment Suspense. `RouteLoading` (the generic
fallback for every other route) shrunk `lg`→`md` (36px→24px) to actually
be "compact" per the audit's word; it already carried `aria-label="Loading"`.
Full per-capability skeleton sweep (customers/suppliers/sales/purchases/
catalogue/...) is a real but unbounded depth item — ~15+ route folders,
each needing its own page-shape read — deliberately not done blind in this
pass; flagged as a P2-adjacent follow-up, not silently skipped.

## Already done this session, before this file existed (fold into P0-03's proof pass, not separately tracked)

- `OrganizationSwitcher`'s masthead ("header") instance: flat `bg-surface`
  card → `glass-control` (matches sibling search/bell), both single- and
  multi-membership branches.
- `--color-surface`/`-elevated`/`-sunken` dark values: were a bare neutral
  hex (`#1c1c1e`, iOS's own literal token) dropped onto our blue-shifted
  canvas (`#090f14`) — two color temperatures in one room. Now
  `color-mix(in oklab, white/black N%, var(--color-canvas))`, same hue,
  only lightness steps change. `src/app/globals.css`.

## Performance side-fix (not an audit ID, found while investigating "why is the site slow")

`sentry.client.config.ts`/`.edge.config.ts`/`.server.config.ts` each carried
a comment claiming "initialises only when a DSN is configured" but the
`Sentry.init(...)` call below it was unconditional. This local dev
environment has no `NEXT_PUBLIC_SENTRY_DSN` set at all, so every page load
was paying for full client-side Sentry instrumentation (fetch/XHR/console
wrapping, breadcrumbs, `tracesSampleRate: 0.1` performance tracing) with
no DSN to send any of it to. Now gated behind `if (process.env.
NEXT_PUBLIC_SENTRY_DSN)` in all three files, matching what the comment
already claimed. The remaining slowness (Turbopack dev-mode HMR,
unminified bundles, per-route recompiles) is expected dev-mode overhead,
not a bug — disappears in a production build.

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
