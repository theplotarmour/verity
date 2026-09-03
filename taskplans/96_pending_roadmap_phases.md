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
  ADR-017. Phase 3 is now buildable.
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

## Phase 2 — Plywood-scoped, single-client work — SKIPPED 2026-09-03

User instruction: Shree Ganesh isn't the priority right now; go straight
to Phase 3. Left recorded below, not deleted — the checkpoint at the end
of this phase (Task 90's trigger) just doesn't fire yet since the phase
didn't run.

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

## Phase 3 — AI agent, near-term (Task 84's six areas) — COMPLETE 2026-09-04

Requires Phase 0's ADR (cleared). Internal order per Task 84's own
dependency note, followed exactly:

8. ~~Areas 1, 2, 3, 5~~ **BUILT** (tool-manifest generator,
   confirmation-class field, actor-scoped tool visibility, query-channel
   parity) — see Task 84 for what shipped, including a real performance
   finding (a naive per-item permission check timed out against the live
   registry; fixed to one resolve-permissions call per manifest build)
   and a real scope correction (`executeQuery` wasn't routed through the
   unified `enforcePolicy` decision point at all before this).
9. ~~Area 4~~ **BUILT** (grounding enforcement, MVP scope — `*Id` fields
   must trace to a same-turn query result; does not yet know WHICH entity
   a field references, see Task 84 for the known gap).
10. ~~Area 6~~ **BUILT** (chat surface — Groq, no new dependency, no new
    secret; persistent dock in `ShellChrome`, not a modal).
11. ~~Task 91~~ **BUILT** (bulk operations + partial failure) — Task 84
    landed the trigger first, as this file predicted. `runCommandBatch`
    consumed immediately by the agent's tool loop, which is also where it
    now gates every destructive command behind `needs_approval` — area 6
    had no confirm UI of its own, so this is that gate until one exists.

**Checkpoint after Phase 3:** all four of this phase's items are code,
typechecked and linted clean. DB-integration verification for Task 91's
new tests is outstanding — blocked by a live Supabase connectivity issue
during this session (statement timeouts on ordinary deletes), not by
anything in the diff; retry `npx vitest run src/test/command-runtime.test.ts`
once connectivity recovers.

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
