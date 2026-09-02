# Task 96 — Phased roadmap for Tasks 72–95

Authority: this file sequences existing taskplans; invents no new
requirements. Every phase below only reorders and gates work already
recorded in Tasks 72–95.

## Status: PENDING — a sequencing document, not new scope

## Why this can't be a flat schedule

Most of Tasks 72–80, 88, 89, 93 carry an explicit "do not build ahead of
demand" trigger (a second client, a second reconciliation instance, a
second finance-heavy client). A phased plan that ignored those triggers
and just queued everything chronologically would violate the rule every
one of those files states for itself. So this roadmap has two kinds of
phase: **scheduled** (can start now, no external trigger needed) and
**standing** (ready to build the moment its stated trigger fires, not
before — sequence among themselves is moot until then).

## Phase 0 — Decisions, not build effort

Nothing below can start until these are made; none of them is
implementation work.

- ~~Write and accept Task 84's ADR.~~ **Done 2026-09-03** — `CLAUDE.md`
  ADR-013. Phase 3 is now buildable.
- **Task 90 (Attention):** decide platform-contribution-point vs.
  capability-local before Phase 2 produces its first real attention
  sources — otherwise Phase 2 builds something Task 90 has to unwind.

## Phase 1 — Zero-dependency, start anytime

No trigger, no second client, no other phase required first.

1. **Task 82** (capability-builder skill) — install this *before* any
   other capability work in this roadmap touches code, per its own Phase
   2 trigger ("before the next large client-module implementation").
   Sequenced first here for that reason, not because it's urgent alone.
2. **Task 85** (foundation conformance script) — write plywood's version
   retrospectively; cheap now, becomes the template Phase 2/4 work reuses.
3. **Task 92** (business timeline) — first step is reading Task 38's
   actual output, not building anything. Resolves to either "small
   presentation layer" or "confirmed gap" — do this early since it's an
   investigation, not a commitment.
4. **Task 94** (incomplete-information states) — apply to plywood's own
   GST fields as the first concrete instance, per its own trigger.

## Phase 2 — Plywood-scoped, single-client work

No second client needed — these serve Shree Ganesh Timber Trading Co.
directly and are real gaps in the one capability that exists.

5. **Task 86** (dashboard states + per-panel isolation) — applied to the
   existing Overview page.
6. **Task 87** (import/export) — plywood's own customer/item/supplier
   import; real need for a real client with pre-Verity records.
7. **Task 93** (progressive setup) — build plywood's own concrete
   onboarding sequence, not a generic engine (its own explicit scope
   limit).

**Checkpoint after Phase 2:** re-evaluate Task 90 (Attention) — plywood
alone may by now have three candidate sources (overdue receivables,
pending goods issue, low stock), which could be enough signal to satisfy
Task 90's "two independent capabilities want this" trigger without
waiting for a second client. Revisit Phase 0's Task 90 decision here if so.

## Phase 3 — AI agent, near-term (Task 84's six areas)

Requires Phase 0's ADR. Internal order per Task 84's own dependency note:

8. Areas 1, 2, 3, 5 (tool-manifest generator, confirmation-class field,
   actor-scoped tool visibility, query-channel parity) — independent of
   each other, can proceed in any order or in parallel.
9. Area 4 (grounding enforcement) — the genuinely unsolved one; budget
   real design time, expect it to reshape areas 1 and 6.
10. Area 6 (the chat surface itself) — needs 1–5 to have something to call.
11. **Task 91** (bulk operations + partial failure) — triggered by
    whichever of Task 84 or Task 87 lands first; likely lands here,
    against Task 84's multi-command turns, unless Task 87's import work
    reaches this need first in Phase 2.

## Phase 4 — Standing, second-client-triggered (not scheduled)

Ready the moment their trigger fires; no work order among them until then.

- **Tasks 72–80** (accounting, inventory, selling, buying, payments,
  billing, HR, payroll, advanced-accounting capabilities) — each on its
  own client-demand trigger, per their own files.
- **Task 88** (reconciliation as a pattern) — trigger: second
  reconciliation instance, most likely arriving via Task 87's bank-import
  work in Phase 2, which would pull this into Phase 2's tail rather than
  leaving it standing.
- **Task 89** (period locking, generalized) — trigger: payroll (Task 79)
  or a second finance-heavy client.

## Phase 5 — Task 95's long-term AI phases (aspirational)

Task 95 Phase 1 ("Grounded Ask") is roughly Phase 3 above already. Phases
2–6 of Task 95 (safe actions at scale, business reasoning, proactive AI,
multimodal/India-language input, bounded autonomous operation) each need
their own scoping pass when picked up — Phase 6 specifically needs its
own future ADR beyond Task 84's, per Task 95's own non-goals. Not
sequenced further here; revisit once Phase 3 is real and proven.

## What this roadmap does not do

- Does not compress Tasks 72–80/88/89's triggers into a calendar —
  they stay standing until a real client/need exists, however this
  document is otherwise reordered.
- Does not authorize starting Phase 1 or Phase 2 work without separate
  confirmation — this is a sequencing plan, not a go-ahead.
- Does not revise any individual taskplan's own scope, non-goals, or
  trigger condition — those remain authoritative; this file only orders
  them.
