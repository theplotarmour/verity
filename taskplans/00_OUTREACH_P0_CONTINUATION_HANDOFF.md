# Handoff — finish Task 114's queue (Outreach execution-layer redesign)

Authority: `taskplans/114_pa_oms_outreach_execution_layer_redesign.md` (the
plan), `taskplans/101_remaining_work_master_plan.md`'s 2026-09-17 addendum
(the sequencing). This file is not new scope — it's a concrete, file-level
continuation checklist so a fresh session can pick up mid-queue without
re-deriving what's already been read this session. Read 114 first for the
*why*; this file is the *where exactly*.

## Done already (commits `929c79e`, `124c407`, `02b88c2`, `4a999e7`)

- Task 113 AI audit (4/5 items; item 3 needs live DB access).
- Task 97/100 stale-status correction (both were already done 2026-09-04,
  just undocumented — no code changed there).
- Task 109/114 corrected for the Kanban-board removal (`ec31890`, a
  concurrent session removed `/outreach/board`, check-in, targets, reports
  same day and shipped `/outreach/prospects` instead — role-scoped cards +
  filters, matching the review's Section 3 almost exactly).
- **Task 114 P0.6 DONE** — `ShellChrome`'s top-bar "Recent activity" bell
  now gated on `canAudit` (was unconditional). Files:
  `src/components/shell/ShellChrome.tsx`, `src/app/(shell)/layout.tsx`.

Verified clean at each step: `npx tsc --noEmit` (clear `.next/` first if it
throws `TS2307` on a deleted page — that's a stale type-cache artifact,
not a real error) and `npx eslint <changed files> --max-warnings=0`.

## Next in order (per 101's addendum, revised for the ec31890 discovery)

### P0.5 remainder — table view + saved filter chips

File: `src/app/(shell)/outreach/prospects/page.tsx` +
`src/app/(shell)/outreach/prospects/ProspectFilters.tsx`.

**Already exists** (built by the concurrent session, don't rebuild): the
card view, viewer-scoped (`founder`/`senior`/`junior`) data fetch, and the
7-filter bar (status/domain/track/health/team/owner + search/sort). What's
missing:
- A view toggle (Cards / Table) — likely a client-side toggle over the
  same `data.cards` array already computed server-side; a table just
  needs a different render of the same rows (columns: Prospect, Stage,
  Health, Owner, Next action, Last touch, Fit, Signals, Actions per 114's
  own spec). Don't refetch — reuse `data.cards`.
- Saved filter chips (`My leads`, `Needs action`, `At risk`) — these map
  onto the existing URL search params (`?owner=<me>`, a new synthetic
  filter for "no `nextActionAt`" or overdue, `?health=AtRisk`) as
  presets, not a new filter model. `ProspectFilters.tsx` is the client
  component to extend.

### P0.1 — work queue: REUSE, DON'T REBUILD

**Important discovery, don't miss this:** `src/server/capabilities/
outreach/index.ts` line 2238, `listLeadQueue` (key
`verity.outreach.lead_queue`), already implements a queue mechanism —
`New` / `NeedsResearch` / `Stale` / `HighPriority` / `AdvancePending` —
scoped to one `teamId` (Task 106 Phase 6, team-leader-oriented, spec
§78). It reuses `deriveLeadHealth` exactly like `/outreach/prospects`
does. This is 80% of what 114's P0.1 "universal work queue" wants.

Two real gaps, not a full new query:
1. **Missing queue kinds**: `Overdue` (nextActionAt < now), `DueToday`
   (nextActionAt is today), `NoNextAction` (nextActionAt null, not
   terminal), `Unassigned` (if that concept exists on `OutreachLead` —
   check; it may not, since every lead has `opportunityOwnerId` from
   creation). Add these to `LEAD_QUEUES` and `listLeadQueue`'s switch,
   same pattern as the five that exist.
2. **Scope shape mismatch**: `listLeadQueue` takes one `teamId`, but
   `/outreach/prospects`'s viewer model (founder sees everything, senior
   sees led teams + own, junior sees own) is richer. Either (a) call
   `listLeadQueue` once per team the viewer can see and merge client-side
   for a founder, or (b) add a viewer-scoped variant. Check which is
   less code before picking — (a) needs zero backend change, (b) needs a
   new query. Lean (a) first given "reuse fitting abstractions" over a
   new query shape, but verify performance for a founder with many teams.

Surface: new small panel/page (`/outreach/queue` or inline on
`/outreach/prospects` above the card grid), calling the extended
`listLeadQueue`.

### P0.3 — consolidate record-detail actions

File: `src/app/(shell)/outreach/[id]/LeadActions.tsx` (578 lines, read in
full this session).

Current top-level buttons, always visible when applicable: **Log
activity, Reassign owner, Record payment, Reactivate, Escalate**, plus
every dynamic stage-transition button (`transitions.map(...)`, includes
terminal ones — `not_a_fit`/`unresponsive`/`lost`/`deferred`/
`disqualified` styled red via `terminal` check at line 127/134).

Target per 114: primary buttons = **Log activity, Set next action** (new
— see P0.2), **Add task** (check if a task-creation command already
exists in `outreach/index.ts` before assuming it needs one). Move to an
overflow menu (a `DropdownMenu`-style component — check
`src/components/ui/primitives.tsx` for an existing one before adding a
dependency): Reassign owner, Record payment, Escalate, Reactivate, and
every terminal transition button. Non-terminal stage-advance buttons
(the normal pipeline moves) can stay primary-adjacent — only the
destructive/terminal/administrative ones need to move, per 114's own
text ("stage transitions that are effectively terminal or destructive").

Keep every existing form component (`LogActivityForm`,
`ReassignOwnerForm`, `RecordPaymentForm`, `ReactivateForm`,
`EscalateForm`) unchanged — this is a **layout/grouping change only**,
not a command-pipeline change.

### P0.4 — two-step add-prospect flow + duplicate check

File: `src/app/(shell)/outreach/NewLeadForm.tsx` (265 lines, not yet read
in full this session — read it first). Currently rendered inline at the
top of `/outreach/prospects/page.tsx` when `canCreate`.

Per 114: split into Step 1 (company, website/LinkedIn, owner, team,
domain, "why now") → creates a minimal record, and Step 2 (what they do,
why relevant, potential need, sales hypothesis, fit score, research
sources) → qualifies it. Check `createOutreachLead`
(`outreach/index.ts` line 461) — confirm which fields are actually
required vs. optional in its Zod schema before designing the two steps;
the split should match the schema's own optionality, not invent new
required-ness.

Duplicate check: before Step 1 commits, query existing leads by
company name / website / LinkedIn URL near-match. Check whether a cheap
`findMany` with a `contains`/`equals` filter against `companyName`/
`website`/`linkedinUrl` is sufficient before adding any new primitive —
per 114's own text, likely is.

### P0.2 — next-action guard on activity submission

File: `src/app/(shell)/outreach/[id]/LeadActions.tsx`'s `LogActivityForm`
(already has `nextActionNote`/`nextActionAt` fields, both currently
optional). Also check `verity.outreach.advance_stage`'s command handler
in `outreach/index.ts` for any other activity-adjacent write path.

Guard: require `nextActionNote`+`nextActionAt` on submit unless the
activity type or resulting state is terminal (closed-won, closed-lost,
disqualified, not-a-fit — reuse `TERMINAL_STATES`, already imported in
`LeadActions.tsx`). This is a **frontend validation change** — confirm
`log_activity`'s command schema doesn't already require these before
assuming a schema change is needed.

### P1 — dashboard restructure, drill-through, trend deltas

File: `src/app/(shell)/outreach/page.tsx` (the summary/dashboard page —
now Senior + Founders' Office only per `ec31890`'s role-scoping; Juniors
redirect to `/outreach/prospects`). Not yet read this session — read it
first, and re-check its current shape against 114 P1's three items
(three-layer hierarchy, drill-through funnel/domain links, trend deltas)
since `ec31890` changed what's on this page too (removed check-in/
targets/reports panels from it).

### Then: Task 111 → Task 112 → Task 114 P2

Per 114's own "Relationship to 111/112" section — material pass
(structured minimalism) before structural pass on shared surfaces
(Outreach dashboard, prospect cards). Note `bg-glass-2` still appears in
`prospects/page.tsx` line ~345 — a live ADR-023 violation Task 112's
rollout should catch.

## Verification checklist for every item above

1. `npx tsc --noEmit` (clear `.next/` first if you see a `TS2307` on a
   file you know was deleted by someone else — stale cache, not new code
   to write).
2. `npx eslint <changed files> --max-warnings=0`.
3. Commit after each completed item (small commits, per
   `[[feedback_commit_workflow]]` memory — continuous commits, one push
   at the end), referencing the P-number in the message.
4. Update `taskplans/114_...md`'s own checklist marks (✅/DONE + date +
   files touched) in the same commit as the code, same discipline this
   session used for P0.6.
5. This environment has no local Postgres — anything needing a live DB
   check (per-tenant verification, migration application) stays flagged,
   not silently skipped or assumed passing.

## Non-goals for whoever picks this up

- Don't rebuild `listLeadQueue` from scratch for P0.1 — extend it.
- Don't rebuild the card view or filter bar for P0.5 — only add the
  table toggle and chips.
- Don't touch `/outreach/board`, `/outreach/check-in`, `/outreach/
  targets`, `/outreach/reports` — deliberately removed by `ec31890`,
  not a regression to fix.
- Don't start Task 114 P2 (sequences, activity-type forms, enrichment)
  without the product-owner scoping 114 itself says it needs.
