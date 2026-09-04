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
