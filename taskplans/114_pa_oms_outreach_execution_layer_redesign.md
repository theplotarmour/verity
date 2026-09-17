# Task 114 — PA-OMS Outreach: execution-layer UX redesign (dashboard, list, record, entry)

Authority: User synthesis, 2026-09-17 — external UX/product review of the live
PA-OMS Outreach instance (dashboard, prospect list, add-prospect flow, prospect
detail workspace, activity/task/meeting entry, Intelligence/Domains, Account),
benchmarked against shadcn/ui interaction primitives and Apollo/Outreach/
Salesloft sales-execution workflow. Continues `taskplans/105_pa_oms_outreach_
capability.md` (capability origin), `taskplans/106_pa_oms_deep_operations_prd.md`
(Phases 1-8 master prompt), and `taskplans/109_pa_oms_outreach_domain_
intelligence_and_ux.md` (Phases F/G/H, BUILT) — this file does not re-open any
of those; it addresses what the review found *after* F/G/H shipped. Also
intersects `taskplans/111_global_settings_and_shell_ux_pattern.md` /
`taskplans/112_complete_ui_ux_upgrade_to_structured_minimalism.md` (ADR-023
solid-material rollout) — see "Relationship to 111/112" below; this file is
about interaction/workflow, not material/color, though one visual finding
(low contrast, over-pale surfaces) is shared with 112's rollout.

## Status: PENDING — proposed from review, nothing in this file built yet

**Correction, 2026-09-17 (same day, later commit):** the Kanban board this
paragraph originally cited as live was removed the same day by a
concurrent session (`ec31890` — Kanban, Daily check-in, Targets, and
Reports surfaces all dropped; see Task 109's own correction note). It no
longer exists in `src/`. The command palette and file-shelf polish from
Task 109 Phase G are still live and unaffected. That same commit also
shipped `/outreach/prospects` — a role-scoped card view with the exact
filter set (status/domain/track/health/team/owner + search/sort) this
review's Section 3 describes; **P0.5 below is now partially done** — the
card view and filter bar exist, only a table-view toggle and saved-filter
chips remain. Everything else below (work queue, record-detail
primary-action consolidation, two-step create flow, dashboard restructure,
activity-type-aware forms) is still net-new scope, not yet started.
**That commit's own message flagged typecheck/tests/browser-check as
unverified** ("blocked by insufficient disk space") — checked 2026-09-17:
`npx tsc --noEmit` and `eslint` on `outreach/` are both clean after
clearing a stale `.next/` type-cache directory that still referenced the
deleted check-in/reports/targets pages (not a real source error). The
commit itself is sound.

## Non-goals

- Not a re-litigation of Task 109's domain-intelligence data model (funnel/
  velocity/aging queries) — those stay; this file changes how they're
  *presented* (drill-through, sparklines), not what they compute.
- Not a material/color redesign — defer contrast and card-treatment fixes to
  Task 112's structured-minimalism rollout where they overlap; this file
  covers interaction affordance and workflow, and only calls out material
  issues where they're inseparable from an interaction fix (e.g. semantic
  stage/health badges need both a color decision *and* a layout decision).
- Not sequences/cadences, template libraries, or enrichment-assisted
  duplicate detection as full features — those are P2/aspirational below,
  explicitly deferred pending product-owner scope confirmation, same posture
  Task 109 took with Experiments/Domain Learnings.
- Not compensation, role progression — permanently excluded per Task 109's
  existing non-goals, unchanged here.

## Relationship to 111/112

Task 111/112 govern *material* (solid cards, hairline borders, semantic
color, contrast) platform-wide, including Outreach's dashboard. This taskplan
governs *workflow and interaction structure* (what's on the page, in what
order, what's clickable, what's a primary vs. destructive action) for
Outreach specifically. Where a single component needs both (e.g. the
dashboard's zero-heavy KPI tiles need re-hierarchization *and* the ADR-023
solid treatment), build the ADR-023 material pass first if 112 reaches that
surface first, then layer this taskplan's structural changes on top — do not
block either on the other; they are independent axes on the same pages.

## P0 — make the system executable (do first)

Reason for ordering: the review's core finding is that Outreach has data but
no decisive "what do I do next" loop. P0 fixes that gap before any visual
polish, because polish on a non-actionable surface doesn't move the needle.

1. **Universal work queue.** A single query/view surfacing: overdue next
   actions, due-today next actions, no-next-action-set leads, unassigned
   leads, at-risk (stale per `deriveLeadHealth`'s existing staleness
   threshold — reuse, don't reinvent). Backend: likely a new query in
   `src/server/capabilities/outreach/index.ts` composing existing per-lead
   fields (`nextActionDueAt`, `ownerId`, `health`) rather than new schema —
   confirm no new entity is needed before adding one. Surface: top of
   `/outreach` dashboard (see P1 dashboard restructure) and its own
   dedicated queue view.
2. **Next-action guard on activity submission.** Every activity-logging path
   (`recordActivity` / `advanceLeadStage` call sites) should prompt for a
   next action unless the outcome is explicitly terminal (closed-won,
   closed-lost, disqualified, not-a-fit). This is a frontend flow change on
   top of the existing command — check whether `recordActivity` already
   accepts an optional next-action payload before adding a new field.
3. **Consolidate record-detail actions.** On the prospect detail page,
   reduce the visible button set to `Log activity`, `Set next action`,
   `Add task` as primary actions; move stage transitions that are
   effectively terminal or destructive (`lost`, `disqualified`, `deferred`,
   `not a fit`, reassignment, `Record payment`) into a labelled overflow
   menu with confirmation text. Pure frontend restructure — `advanceLeadStage`
   and friends are unchanged, only which control calls them and how it's
   presented.
4. **Two-step add-prospect flow with duplicate warning.** Replace the
   current single long inline form with a two-step sheet/modal: Step 1
   (company, website/LinkedIn, owner, team, domain, "why now") creates a
   minimal record; Step 2 (what they do, why relevant, potential need,
   sales hypothesis, fit score, research sources) qualifies it. Add a
   duplicate check (matching website/LinkedIn URL/company name) before
   Step 1 commits — check whether `createOutreachLead` can be queried
   cheaply for near-matches (company name + domain) before adding a new
   duplicate-detection primitive; a simple pre-submit query against
   existing leads may be sufficient for v1.
5. **Prospect list view toggle: Cards / Table.** Add a data-table view
   (columns: Prospect, Stage, Health, Owner, Next action, Last touch, Fit,
   Signals, Actions) alongside the existing card view, plus saved filter
   chips (`My leads`, `Needs action`, `At risk`) built from the existing
   filter fields (status/domain/track/health/team/assignee) rather than a
   new filter model.
6. **Fix the Audit navigation dead end. DONE 2026-09-17.** `ShellChrome`'s
   top-bar bell (`/audit`) is now gated on the same `canAudit` boolean the
   sidebar's own Audit entry already used — an actor without `Read` on
   `verity.platform.activity` no longer sees the bell at all, so the dead
   end is gone rather than explained. `npx tsc --noEmit` and `eslint`
   clean on both changed files (`ShellChrome.tsx`,
   `app/(shell)/layout.tsx`).

## P1 — dashboard restructure and analytics drill-through

1. **Three-layer dashboard hierarchy** replacing the current flat stack of
   eight KPI tiles + direction card + team table + funnel + leads:
   - Today's execution: work queue (from P0.1), quick-log-activity entry
     point.
   - Pipeline health: active pipeline value/count, stage movement this
     week, response rate (with sample-size shown per the existing
     `thinSample`/`THIN_SAMPLE_BELOW` pattern from Task 109's domain work —
     reuse, don't reinvent), at-risk prospects.
   - Management intelligence: team leaderboard, funnel conversion, domain/
     channel performance, current direction (kept, made editable per the
     review's suggestion — confirm with product owner before adding
     inline-edit to a card that's currently read-only).
2. **Funnel and domain analytics as drill-through, not display-only.** Make
   funnel stage segments and domain cards clickable into the filtered lead
   set (reuses `getDomainFunnel`/`getDomainVelocity`/`getDomainAging` from
   Task 109 Phase F — this is a frontend linking change, not a new query
   layer, unless the existing queries can't be parameterized for a
   "show me these leads" drill-through, in which case flag as an
   implementation decision before adding one).
3. **Trend deltas.** "This period vs. previous period" comparison on key
   metrics — needs a decision on what "period" defaults to (7d, per the
   review's suggestion) and whether existing queries can be windowed twice
   cheaply or need a comparison-aware variant. Flag as an open decision if
   the query cost is non-trivial.

## P2 — sales-execution parity (Apollo/Outreach/Salesloft-shaped, largest scope)

Explicitly larger scope, explicitly not committed yet — list here so it's
tracked, not silently dropped, same posture Task 109 took with Experiments/
Domain Learnings.

- Activity-type-aware entry forms (different fields for email/LinkedIn vs.
  call vs. meeting vs. research vs. proposal) — needs product-owner
  confirmation of the field set per type before building; do not invent one
  unasked, echoing Task 109's own "don't invent a threshold unasked" posture
  on unusual-pipeline-movement.
- Sequences/cadences (multi-step automated + manual touch plans) — this is
  the single largest net-new capability implied by the review and needs its
  own scoping pass (likely its own taskplan) before estimation; do not
  start building against this taskplan's text alone.
- Command palette action expansion: creation actions (create prospect, log
  activity, add task, schedule meeting) inside the existing Cmd/Ctrl+K
  palette from Task 109 Phase G, not just navigation/search.
- Enrichment-assisted prospect creation (website/LinkedIn URL → auto-drafted
  qualification fields) — depends on whether an external enrichment source
  is in scope at all; no such integration exists in this codebase today,
  so this is an "implementation decision required" (new external
  dependency) before any code is written, not a P1/P0-adjacent task.

## Open decisions for whoever picks this up

- Whether the work queue (P0.1) needs a new query/entity or can compose
  existing lead fields — check before adding schema.
- Whether "Current direction" becomes inline-editable (P1.1) — confirm with
  product owner; the review suggests it, but it's not yet a decision.
- Trend-delta period default and query cost (P1.3).
- Field set per activity type (P2) — do not invent without product-owner
  input.
- Whether sequences/cadences (P2) get their own taskplan number now or wait
  until P0/P1 land — recommend deferring the number until scoping starts,
  to avoid an empty placeholder taskplan.
