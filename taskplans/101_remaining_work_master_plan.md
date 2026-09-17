# Task 101 — Master plan: everything still open, sequenced

Authority: direct read of every remaining PENDING taskplan (74–81, 86–90,
93, 95, 99, 100) in full, 2026-09-04, cross-referenced against
`00_STATUS_INDEX.md` (stale — generated 2026-09-02, predates this
session's Tasks 72/73/77/78/82/84/85/91/92/94), `taskplans/96_pending_
roadmap_phases.md` (Phases 1/3/4 now complete), and the actual current
state of `src/`, `prisma/schema.prisma`, and the ADR register
(`verity-spec/17_decisions/adr/`, currently through `adr-017.md`).

## Status: PLANNING document. Sequences existing scope; invents none.
Every item below cites the taskplan it comes from — this file does not
restate their reasoning, only orders it and names what's needed to
unblock each one.

## Why this file exists

`96_pending_roadmap_phases.md` sequenced Tasks 72–95 into five phases;
Phases 1/3/4 are now done (2026-09-04). What's left is a mix this file
sorts into four real categories, because "still PENDING" hides very
different kinds of blocked:

1. **Zero-dependency, buildable now** — nothing stops these except time.
2. **Needs an ADR first** — the taskplan says so itself; starting code
   before the ADR is exactly the mistake `CLAUDE.md`'s stop conditions
   exist to prevent.
3. **Needs a real trigger that hasn't fired** — a second client, a real
   external-data onboarding, an enterprise consolidation need. Nothing to
   build; the honest state is "ready when it happens."
4. **Needs an explicit product-owner decision** — not a trigger, not an
   ADR, just a yes/no this file cannot make for you (Task 100's shadcn
   and metrics-history questions specifically).

## Zeroth: housekeeping before anything else

These aren't taskplan items but block accurate future planning if left
undone:

- **`00_STATUS_INDEX.md` is stale.** It predates Tasks 72/73/77/78/82/84
  (now complete)/85/91/92/94. Regenerate it against current `git log` and
  `src/` — its own header says to do exactly this "if more than a few
  weeks stale," and it's a few hours stale in session-time, calendar-
  identical but content-wise nine taskplans out of date.
- **Task 97's two leftover items are still on you** (permission-blocked
  for me both times): `rm .eslintrc.json` (confirmed dead — flat-config
  ESLint 9 doesn't read it) and `rm -rf tmp_backup_verity tmp-010-*.mts
  tmp-010-*.mjs` (confirmed gitignored, untracked, local-only noise).
- **Task 81's trigger has fired and nobody's checked compliance yet.**
  Its own status line says "PENDING — no Verity assistant/command-layer
  exists yet to apply this to." `agent-chat.ts` (Task 84 area 6) is that
  layer now. Task 81 has 16 numbered rules; nobody has walked them
  against what actually shipped. This is cheap (read 16 rules, read
  ~400 lines of `agent-chat.ts`/`batch.ts`, note gaps) and should happen
  before any more agent-facing work — see "First, cheap" below.

## Category 1 — zero-dependency, buildable now

Ordered by value-per-effort, not by number.

### 1a. Task 81 compliance audit (NEW — not its own taskplan, cheap)

Walk all 16 of Task 81's rules against `src/server/platform/agent-chat.ts`,
`batch.ts`, and `grounding.ts`. Known candidates for gaps, from memory of
what was actually built vs. the rule list's breadth (rule 9 error
taxonomy, rule 12 business-language permissions, rule 14 explainability,
rule 16 "auditability before automation") — none of these were explicitly
checked when Task 84 area 6 shipped, only the ADR-017 authority question
was. Do this before extending the chat surface further, not after.

### 1b. Task 99 Skills 2 and 3 — cheapest, highest-value, do first

Both traced to real mistakes THIS project already made (per Task 99's own
citations) — and Skill 3 specifically would have caught the exact
migration-checksum problem this session spent real effort diagnosing by
hand:

- **`verity-adr-gate`** — before writing any ADR, check all three
  registers (`verity-spec/17_decisions/adr/`, `CLAUDE.md`'s own list,
  `taskplans/17A`'s `V2-ADR-*` series), find the true next number, write
  canonically, update every citing location in one pass.
- **`verity-migration-safety`** — `prisma migrate status` + `prisma
  generate` + a smoke query against any changed model, as a standard
  step after any schema change. Would have surfaced this session's
  `_prisma_migrations` drift in seconds via `migrate status` instead of
  the multi-step diagnosis it actually took.

### 1c. Task 86 — dashboard/panel state model

Zero dependency per its own file. Two parts: (1) name the five states
(Empty/first-setup, Operational, Attention, Degraded, System failure) as
an actual type, not implicit; (2) per-panel fetch isolation on Overview —
its own scope note says "check current implementation before assuming it
needs changing." Do the check first; this may be partially built already,
same pattern as Task 92 turned out to be.

**Blocks Task 90** — Attention state consumes this model, per Task 90's
own scope.

### 1d. Task 92's remaining coverage (follow-on to today's fix)

`supplierDetail`/`customerDetail` don't call `reconstructHistory()` at
all. Now that the `kind` bug is fixed and the pattern is proven on two
order types, extending to customer/supplier detail is mechanical: import
`reconstructHistory`, pass `ENTITY_CUSTOMER`/`ENTITY_SUPPLIER` and the
record id, map into the same `ActivityEntry` shape (now with `kind`
included from the start, no follow-up bug this time). Employee/asset
detail views don't exist yet in any capability that would need this —
skip until one does.

## Category 2 — needs an ADR before code

Both of these say so in their own file, explicitly, not as a suggestion.

### 2a. Task 90 — "Attention" platform concept

Its own trigger: "two real capabilities each independently wanting this."
**Checked 2026-09-04: trigger has NOT fired.** `InventoryItem` carries a
`reorderLevel` field, but no query was ever built to surface "items at or
below it" the way plywood's `lowStock` does — the field exists, the
attention *source* doesn't. Data sitting unused is not a second capability
independently wanting the feed. Still one real instance (plywood). Revisit
only once a second capability actually builds and surfaces its own
exceptions list, not when it merely has the data to someday.

### 2b. Task 93 — progressive setup / capability readiness engine

Its own text: "the biggest platform-primitive-shaped item on this list
and the one most likely to be over-built if started as a generic engine."
Explicit non-goal against building a generic engine now. If picked up:
build plywood's own concrete onboarding sequence first (Company details →
Godown → Products → Suppliers → Customers → Pricing → First purchase →
First sale, per its own example), relate it to Task 85's acceptance
script (Task 93's own note: "Task 85 could reasonably be written first
and this task's step sequence derived from it" — Task 85's plywood script
already exists and passed; deriving the onboarding sequence from it is
now a smaller step than starting from nothing).

## Category 3 — needs a real trigger, nothing to build yet

Confirmed still unfired as of 2026-09-04. Listed so nobody re-investigates
them from scratch next time — the answer is "still waiting," not
"unknown."

- **Task 74/75/76** (selling/buying/payments) — need Tasks 72/73
  *settled*, not just built. Concretely: `acceptance-accounting.md`
  (Task 85) needs to move from PENDING to PASS via a real walk-through,
  and ideally some real transaction volume through accounting/inventory,
  before "settled" is honest rather than aspirational. Re-check this
  gate specifically, not the original "second client" trigger, which the
  product-owner already overrode once this session.
- **Task 79** (payroll) — still no Indian statutory spec (PF/ESI/TDS/Form
  16). If a concrete Indian payroll client appears, the FIRST step is
  statutory research from real government sources (EPFO, ESIC, Income
  Tax Dept. TDS rules), not code — flag this explicitly so whoever picks
  it up doesn't start from ERPClaw's US shape by habit.
- **Task 80** (advanced accounting) — needs Task 72 to actually exist in
  the "settled" sense above, plus an enterprise consolidation/lease-
  accounting client. Neither present.
- **Task 87** (import/export) — trigger is "the next client onboarding
  that isn't a from-scratch demo seed." Hasn't happened. When it does,
  its own shape (`Import → map → validate → preview → commit →
  reconcile`) should reuse Task 91's `runCommandBatch` for the commit
  step's partial-failure handling — that connection wasn't available when
  Task 87 was written (Task 91 didn't exist yet) and is worth stating now
  so it isn't rediscovered later.
- **Task 88/89** (reconciliation/period-locking patterns) — still
  genuinely one instance each (plywood's stock reconciliation; plywood's
  period close). Task 87's bank-statement import, whenever it happens, is
  the most likely second instance for Task 88 specifically, per Task 87's
  own cross-reference.

## Category 4 — needs an explicit yes/no from you, not a build step

### 4a. Task 100 — two blocking decisions

- **Sparklines/trend charts "everywhere appropriate"**: blocked on a
  metrics-history/snapshot capability that doesn't exist — every Overview
  number today is a live aggregate, not a retained time series.
  `charts.tsx`'s own rule ("no sample data, no smoothing, no projected
  series") forbids faking one. Decision needed: build a metrics-history
  capability (real scope, its own taskplan-sized effort), or drop
  sparklines from the direction entirely for now.
- **shadcn/ui "as the foundation"**: Verity already has a deliberate,
  hand-built component layer with no shadcn scaffolding. Decision needed:
  explicit yes (accept either running two systems in parallel, or a large
  migration) or no (keep the existing hand-built layer, treat shadcn as
  reference-only). This file takes no position — Task 100 itself already
  flagged both, unresolved.

The rest of Task 100 (asymmetric layout, intelligent cards, per-role
views) has no conflict and no missing infrastructure — buildable under
Category 1 whenever Overview work is next picked up, independent of the
two decisions above.

## Category 5 — recorded, not scheduled

- **Task 95** (long-term AI vision) — aspirational by its own explicit
  statement, subordinate to Task 84 (now complete for its near-term
  scope) and gated behind Task 84 areas being "actually proven," which
  means real usage, not just shipped code. Phase 6 specifically needs its
  own future ADR beyond ADR-017 — restated here so it isn't missed later.
- **Task 99 Skills 4/5/7/8** (`verity-taskplan-writer`, `verity-rd-miner`,
  `verity-orientation`, `verity-design-companion`) — real value, no
  urgency, explicitly deferred by Task 99's own priority ranking. Skill 6
  (`verity-capability-boundary-check`) is higher-value but needs real
  design work (not every platform-touching change is a clean file-path
  rule) — worth scoping seriously once two developers are actually
  working in parallel, not before.

## Recommended order, if picked up in one sitting

1. Zeroth housekeeping (regenerate status index, Task 97 cleanup — the
   latter needs you specifically).
2. 1a (Task 81 audit) → 1b (Skills 2/3) — cheap, prevents repeat mistakes
   on everything that follows.
3. 1c (Task 86) → check whether 2a's (Task 90) trigger has now fired
   (inventory's reorder check may qualify) → write the ADR if so → build
   Task 90 consuming Task 86's state model.
4. 1d (Task 92 coverage extension) — small, proven pattern, no reason to
   defer once reached.
5. Everything in Category 3 stays untouched until its real trigger fires
   — re-reading this file at that point is faster than re-investigating.
6. Category 4 decisions — ask explicitly, don't guess, whenever Overview/
   dashboard work is next a priority.

## Non-goals

- Not a re-litigation of any trigger, non-goal, or scope boundary any
  cited taskplan already states — this file sequences, it does not
  override.
- Not authorization to start Category 2 or Category 4 items without the
  ADR or decision each explicitly requires.
- Not a claim that Category 3's triggers won't fire soon — only that they
  haven't, as of 2026-09-04.

## Addendum, 2026-09-17 — Tasks 102–114, current sequencing

This file predates thirteen taskplans (102–114). Rather than a full
rewrite, this addendum extends the same four-category method above to
everything new, and records what's actually been done since 2026-09-04.

**Since 2026-09-04, resolved from the body above:** Task 86 (dashboard/
panel state model) and Task 92's remaining coverage are done (see
`00_STATUS_INDEX.md` Done table). Task 90's trigger is still **not**
fired — see its own file's 2026-09-17 "Trigger watch" note, added today
after Task 114 raised the question directly; still one real instance, now
explicitly including Outreach's capability-local work queue as a
considered-and-rejected generalization candidate, not a second instance.
Category 3/4 items (74-76, 79, 80, 87, 88, 89, Task 100's two decisions)
remain exactly as this file's body describes — nothing has fired.

**New Category 1 (buildable now, zero dependency):**
- Task 113 item 2 (AI model/deployment config) — **done 2026-09-17**:
  confirmed `groq/compound` rejects tool calls, swapped `OPENAI_MODEL` to
  `openai/gpt-oss-120b` (confirmed via live probe), but this uncovered a
  *second* bug — the real integration test still fails to persist an
  insight after a successful tool call. Task 113 items 1/3/4/5 (global
  agent regression check, per-tenant BUILT-vs-PROVEN, `toolKeys`
  generalization, Task 95 reality gap) are unrun — do these next, cheap,
  before any more AI-surface work, same reasoning this file already
  applied to Task 81's compliance audit.
- Task 114 P0 (Outreach work queue, record-action consolidation,
  two-step create, list table view, Audit-nav dead-end fix) — buildable
  now, no ADR/decision/trigger gate. Highest-value item in this addendum.
- Task 111 (global settings/shell UX pattern) — resolved same day by
  ADR-023, buildable now.
- Task 112 (structured-minimalism platform rollout) — buildable now,
  land incrementally; sequence after 111 per 111's own status note.
- Task 100's non-blocked remainder (asymmetric layout, intelligent cards,
  per-role views, sparkline UI construction over already-existing
  metrics-history data) — buildable now. **Correction, 2026-09-17: the
  schema migration and shadcn decision are NOT gated** — both were
  actually resolved 2026-09-04 (commit `e92dbee`) and just never marked
  in this file or the index; confirmed live 2026-09-17.
- Task 97 Findings 1/6 (`rm .eslintrc.json`, `rm -rf tmp_backup_verity...`)
  — **correction, 2026-09-17: already done 2026-09-04, same commit
  `e92dbee`.** This file's body above and the index both had this wrong;
  fixed in both places today.

**New Category 4 (needs an explicit yes/no):**
- ~~Task 97 Finding 1/6 and Task 100's migration~~ — **resolved
  2026-09-17: both already done 2026-09-04, nothing left to ask.**
- Task 114 P2 (activity-type field sets, sequences/cadences scope,
  enrichment-assisted creation) — needs product-owner scoping before any
  code, per Task 114's own text; do not start from that file's prose
  alone.
- Task 99 Skill 6 (`verity-capability-boundary-check`) — needs real design
  work, not a yes/no exactly, but explicitly "not before two developers
  work in parallel" per Task 99 — recorded here so it isn't picked up
  early by mistake.

**Recommended order for 102-114, appended to the body's own order (revised
2026-09-17 after Task 97/100 turned out to need no permission ask):**
1. Task 113 items 1/3/4/5 — **DONE 2026-09-17** except item 3 (needs live
   DB access this environment lacks).
2. ~~Ask for Task 97/100 permission~~ — **not needed, already done
   2026-09-04.**
3. Task 114 P0 (highest buildable-now value) — next up.
4. Task 111 → Task 112 (pattern, then rollout) — sequence with 114 P0/P1
   on shared surfaces (Outreach dashboard) per Task 114's own
   "Relationship to 111/112" section, material pass before structural
   pass.
5. Task 100's sparkline UI + non-conflicting remainder, interleaved with
   112's rollout since both touch Overview/dashboard surfaces.
6. Task 114 P1 (dashboard restructure, drill-through, trend deltas).
7. Task 114 P2 and Task 99 Skill 6 — park until their respective
   scoping/parallel-dev conditions are met.
