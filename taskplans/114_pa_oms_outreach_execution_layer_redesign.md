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

## Status: P0 + P1 DONE 2026-09-17 (commits 9a873cc..6775ec9); P1.5 items 1-9 ALL DONE (commits e6006ce..e05a790, items 6 and 9 partial — see each item's own note). The manual, team-operated launch scope is COMPLETE 2026-09-18; P2 automation/integration work is intentionally deferred — see the re-scope note at file end.

All of P0 (P0.1-P0.6) and P1 are complete. Summary, newest work first:

- **P1** — three-layer dashboard restructure (Today's execution / Pipeline
  health / Management intelligence) + trend deltas (7d-equivalent period,
  the taskplan's own suggested default) + confirmed the "current direction
  inline-edit" concern was already satisfied by the existing `DirectionForm`
  rendered directly under the banner. Funnel drill-through needed no work
  (already built). `src/app/(shell)/outreach/page.tsx`.
- **P0.4** — two-step add-prospect flow. New `verity.outreach.
  update_qualification` command (Step 2's write path — none existed).
  `NewLeadForm.tsx`.
- **P0.3 + P0.2** — primary button row narrowed to Log activity + non-terminal
  transitions; everything administrative/terminal moved to a new
  `OverflowMenu` primitive (`src/components/ui/OverflowMenu.tsx`, no
  dependency). Next-action fields now required on activity log.
  `[id]/LeadActions.tsx`.
- **P0.1** — universal work queue. `listLeadQueue` gained `Overdue`/
  `DueToday`/`NoNextAction` kinds (no `Unassigned` — every lead has a
  required owner at creation). New `WorkQueuePanel.tsx`, viewer-scoped
  across every visible team, surfaced on `/outreach/prospects` and the
  dashboard.
- **P0.5 remainder** — Cards/Table view toggle (reuses `DataTable`) + three
  saved filter chips (My leads / Needs action / At risk). Fixed the known
  live `bg-glass-2` violation in the process. `prospects/page.tsx`,
  `ProspectFilters.tsx`.

Three explore passes before building corrected several of this file's own
assumptions — recorded inline in the commits: the duplicate-check
(`check_duplicate_prospect`) and task-creation (`create_task`) commands
already existed before this session; only their UI wiring needed work (or,
for tasks, nothing — `TaskPanel` already has its own create control on the
same page as `LeadActions`, so P0.3 added no duplicate "Add task" entry).

Verification: `npx tsc --noEmit` and `npx eslint --max-warnings=0` clean
after every commit. No local Postgres in this environment — nothing here
needed a live-DB check (no migration, pure query/command/UI layer), so
that limitation doesn't apply to this batch of work.

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

## P1.5 — re-audit gaps (2026-09-17, found re-checking the review against this file)

Re-reading the original review against everything above surfaced nine items
the review raised that P0/P1/P2 did **not** actually cover — recorded here so
they don't quietly fall off. None of these are started.

1. **Shell chrome polish.** Sidebar icon size (18-20px, currently smaller),
   active-nav-state contrast (currently low, beige-on-off-white), a
   collapsible icon-rail mode for desktop, workspace-switcher chevron
   (currently a plain label), bell/notification unread count. File:
   `src/components/shell/ShellChrome.tsx`. Overlaps Task 112 (contrast is
   a material concern) but icon sizing/rail/chevron/unread-count are
   interaction changes, not material ones — this file's job, not 112's.
2. **Bulk-action system on the prospect list.** Row/card checkboxes with a
   contextual action bar (assign, stage-move, health update, task
   creation, export) once 2+ are selected. Not mentioned in P0.5's original
   text — genuinely missing, not implicit in the table-view toggle.
3. **Prospect-detail tabs split.** Review asks for Overview / Activity /
   Contacts / Tasks / Meetings / Research / Commercial as separate tabs.
   P0.3 above only consolidates *buttons* (primary vs. overflow) — it does
   not restructure the page's long-scroll layout into tabs. Bigger change
   than P0.3; needs its own pass over `[id]/page.tsx`'s current section
   order before committing to a tab boundary that matches the data's
   actual shape.
4. **Contact-management prominence + timeline event filters.** "No
   contacts added yet" is currently a low-emphasis empty state despite
   being a sales blocker; the activity timeline has no per-type filter
   (outreach/replies/meetings/payments/stage-changes/notes/tasks). Neither
   is in P0.3 or P1 — needs its own item once the tabs split (item 3
   above) gives contacts/timeline their own surface to be prominent on.
5. **Card verbosity reduction on the existing card view.** P0.5 only adds
   a *table* alternative; it does nothing to shorten the cards themselves,
   which the review separately flagged as too dense for scanning. If the
   table view becomes the default for daily pipeline work (likely, per
   the review's own framing — "tables are better for daily pipeline
   work"), this may resolve itself without touching the cards; don't
   pre-emptively rewrite the card layout until the table ships and it's
   clear whether cards still need fixing.
6. **Activity-entry UX details**: anchored panel instead of a floating
   right-aligned one, due-date quick-defaults (tomorrow / 3 days / next
   week), a follow-up recommendation based on stage/touch history. None of
   these are in P0.2 (P0.2 only makes next-action *required*, not easier
   to fill in) or P2 (P2's activity-type-aware forms are a bigger,
   deferred item — these three are small enough to ship without waiting
   for that scoping).
7. **Intelligence cohort/date/owner/source filters.** P1.2 only makes the
   existing funnel/domain views clickable (drill-through); it adds no new
   filter axes. The review's ask for cohort/date-window/owner/source
   filtering on `/outreach/intelligence` is separate scope.
8. **Add-prospect flow sub-items not in P0.4's text**: a searchable
   hierarchical combobox for Domain (currently a flat select, per the
   review — confirm current control before assuming), a "Save draft" path
   distinct from "Create qualified prospect," and a fit-score rubric
   explainer (1-3 weak / 4-6 plausible / 7-8 strong / 9-10 priority) shown
   next to the score input. P0.4 only covers the two-step split and
   duplicate detection.
9. **Permission-denied recovery flow.** P0.6 (done) *hides* the Audit nav
   entry for actors who lack the permission — a different fix than the
   review's ask, which was a recovery action (`Request access` / `Contact
   administrator` / `Switch workspace`) on the denied page itself. Hiding
   the entry means most actors never see the denial at all, which resolves
   the "dead end" complaint, but does **not** build the recovery flow the
   review describes for the cases where a denial is still reached (e.g. a
   bookmarked `/audit` URL). If a real "request access" flow is wanted,
   it needs a product-owner decision — Verity has a notification substrate
   (`notification.ts`) that could carry the request, but no existing
   "request access to X" command/flow exists anywhere in the codebase to
   model it on.

**Explicitly out of this taskplan, noted so it isn't confused for a gap
here:** Account profile/photo/session controls (review §8) is not
Outreach-specific — it belongs to a platform/Account taskplan, not this
one. Status-badge semantic-color strengthening and general contrast fixes
are Task 112's job per this file's own "Relationship to 111/112" section —
listed here only as a reminder to confirm 112's rollout actually reaches
Outreach's badges, not as new scope for this file.

**P1.5 status, 2026-09-17 (session that finished P0/P1):** item 1 (shell
chrome polish) is DONE — see the Status section above; icon size,
active-nav contrast, and the workspace-switcher chevron were all already
correct (re-checked against current code, not assumed from the review's
older text), only the bell's unread count was a real gap and is now built.

**Items 2-4 and 6-9 DONE, same day, later session (commits e6006ce..8e038f7):**
- **Item 2** (bulk-action system) — `DataTable` gained a `bulkActions`
  render-prop; prospects table wires it to a new `BulkActionBar`: bulk
  reassign-owner, bulk add-task, CSV export. Bulk stage-move and bulk
  health-update deliberately omitted (transitions are lead-state-dependent;
  health is derived, never stored — nothing to bulk-write).
- **Item 3** (detail-page tabs split) — new `Tabs` primitive
  (`src/components/ui/Tabs.tsx`); `[id]/page.tsx` restructured into
  Overview / Activity / Contacts / Tasks / Meetings / Research /
  Commercial, per-tab counts on the strip.
- **Item 4** (contact prominence + timeline filters) — Contacts tab's
  empty state is now an accent-bordered CTA box; new `ActivityTimeline`
  component adds a per-activity-type filter chip row. Payments/stage-
  changes/tasks stay on their own tabs — separate entities, not activity
  rows.
- **Item 6** (activity-entry UX) — **partial**. Due-date quick-defaults
  (Tomorrow/3 days/Next week) added to `LogActivityForm`. Panel was
  already inline/anchored, not floating, so no layout change needed
  there. Follow-up recommendation based on stage/touch history NOT
  built — needs a heuristic decision (what history, what threshold) the
  review didn't specify.
- **Item 7** (Intelligence filters) — `WINDOW_INPUT` gained optional
  `teamId`/`ownerId` (additive, same pattern as the existing `domainId`),
  threaded into all three Intelligence queries via a shared `leadScope()`
  helper; new `IntelligenceFilters` bar (URL-state). "Source" filter not
  added as a separate axis — channel is already the page's own breakdown
  table.
- **Item 8** (add-prospect sub-items) — Domain field is now a searchable
  `FormCombobox` (reused, not rebuilt); Step 1 gained a "Save as draft"
  action distinct from "Next: qualify"; fit-score field now shows the
  rubric inline (1-3 weak / 4-6 plausible / 7-8 strong / 9-10 priority).
- **Item 9** (permission-denied recovery) — **partial**. `PermissionDenied`
  now renders a "Go to dashboard" link instead of prose alone. A real
  "Request access" flow (Request access / Contact administrator / Switch
  workspace, per the review's specific ask) is NOT built — no command or
  notification pattern for "request access to X" exists anywhere in the
  codebase to model one on, and this needs a product-owner decision
  before inventing one.

**Item 5 (card verbosity) DONE 2026-09-18** (commit `e05a790`), overriding
its own earlier "wait for real usage" advice on explicit user instruction
to finish P1.5 outright — the card body was trimmed from four
qualification fields to one ("Why relevant", 2-line clamp), and the
footer from five meta items to three (Assigned to / Team / Last
activity), matching `[id]/page.tsx`'s Overview tab which already carries
the fuller detail.

`npx tsc --noEmit` and `npx eslint --max-warnings=0` clean after every
commit in this batch. No local Postgres in this environment — none of
this batch needed a live-DB check (pure query/command/UI layer, one
additive zod field, no migration).

**P2 status:** Re-scoped 2026-09-18 by product owner. External enrichment,
automated sending and third-party cadence execution are intentionally deferred:
the launch product is a manual, team-operated system of record. The completed
launch slice is the record workflow (prospects, detail, activity/task/meeting
entry, work queue, team hierarchy and Core oversight), not a sales-engagement
vendor replacement. Future integrations must remain optional adapters and must
not become a precondition for a staffed team to operate.

**Launch hierarchy completed 2026-09-18:** every staffed outreach user has a
`My Team` roster view; Core has a cross-team `Teams` directory; each team has a
member drill-down, and each member has an operational page listing only their
owned prospects and next actions. Access is tenant-scoped and role-checked at
each route. This replaces daily-reporting dependency with live, attributable
prospect activity and ownership.

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
