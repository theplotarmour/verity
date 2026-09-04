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

## Phase 1 — Zero-dependency, start anytime — COMPLETE 2026-09-04

Run last, after Phases 2/3/4 rather than first as originally sequenced —
Task 82's own trigger ("install before the next large client-module
implementation") technically slipped since Tasks 72/73/77/78 landed first,
but the skill's value is forward-looking regardless.

1. ~~**Task 82**~~ **BUILT** — `.claude/skills/verity-client-capability-
   builder/SKILL.md`.
2. ~~**Task 85**~~ **BUILT** — `implementation/13-conformance/
   acceptance-plywood.md` (PASS) and `acceptance-accounting.md` (PENDING,
   honestly unwalked).
3. ~~**Task 92**~~ **PARTIALLY BUILT, confirmed** — the infrastructure
   (`reconstructHistory`, `ActivityLog`) already existed; found and fixed a
   real bug (fact entries showed a raw event name instead of nothing). Per-
   entity coverage beyond purchase/sales orders stays open.
4. ~~**Task 94**~~ **MECHANISM DECIDED** — `Select`-type companion status
   field, no new platform primitive, no plywood retrofit (its own
   non-goal). Taught in Task 82's skill.

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

## Phase 4 — Standing, second-client-triggered — TRIAGED 2026-09-04

Was: ready the moment their trigger fires, no work order until then. User
explicitly overrode the demand-trigger gate 2026-09-04 ("build ahead of
demand"). Every one of the 11 items was then individually re-checked against
its OWN taskplan for blockers independent of the demand trigger — the
override waives "no client asked yet," it does not waive a missing
specification, a structural "nothing to generalize from yet," or an explicit
same-set sequencing dependency. Result:

**Built and LIVE (schema + capability code, migrated, wired into
`registry.ts`, verified by the full test suite — `3311175`):**
- **Task 72** (accounting) — `53e3d62`. Chart of accounts, append-only
  balanced GL, reversal-only correction.
- **Task 73** (inventory) — `19c873d`. Item master, warehouse stock balance,
  append-only movement ledger. Renamed `Inventory*` after a real model-name
  collision with plywood's own `StockBalance` was caught by `prisma
  generate`.
- **Task 77** (billing) — `59d2b0e`. Meters, readings, flat rate-per-unit
  period invoicing; double-billing blocked by a DB unique constraint, not an
  app check. Designed for Task 91's `runCommandBatch` to drive "bill every
  meter."
- **Task 78** (HR) — `4c316d9`. Departments, employees (attributes on an
  EXISTING Party, INV-003 — never a second identity), leave types/
  applications/append-only decisions.

Drafted first with zero runtime effect, then wired live once the migration
blocker (below) was resolved with explicit product-owner authorization at
each step: the checksum fix, then the 16-table migration itself.

**Skipped — same-set sequencing dependency, not just demand:**
- **Task 74** (selling) — its own text: "only after accounting (72) and
  inventory (73) contracts are settled." Mine are drafted, not settled
  (unmigrated).
- **Task 75** (buying) — landed cost spans GL (72) and inventory (73)
  valuation together; its own text wants plywood's purchase-chain
  "stabilized enough to generalize from" first.
- **Task 76** (payments) — its own text: "build only after accounting
  semantics (Task 72) are fixed... extracted only after... not standalone."

**Skipped — missing specification, not a demand gate an override can
waive:**
- **Task 79** (payroll) — the file's own words: its ERPClaw shape
  (FICA/FUTA/SUTA, W-2) is "not a spec to implement as-is" for an Indian
  deployment, and gives no PF/ESI/TDS rules to build instead. Nothing here
  to build without inventing statutory logic, which nobody asked for and
  which being wrong has real consequences.
- **Task 80** (advanced accounting) — ASC 606/842, consolidation, currency
  translation: correctness-critical accounting-standard domains with no
  concrete spec in the file, which also repeats "do not build ahead of
  demand" explicitly and requires Task 72 to actually exist (mine doesn't
  yet — unmigrated).

**Skipped — structurally premature, independent of demand:**
- **Task 88** (reconciliation pattern) — its own text: "do NOT build...
  speculatively... only once a second real instance exists." Only plywood's
  stock reconciliation exists; there is nothing to generalize FROM yet.
- **Task 89** (period locking) — same shape, same own-text instruction, even
  fewer instances than Task 88.

**The migration blocker — resolved 2026-09-04, with explicit product-owner
authorization at each step, no data loss:**
1. `_prisma_migrations` had two rows for
   `20260901120000_plywood_discounts_and_party_payments` — one failed
   attempt (hit `plywood_payment`'s posted-document immutability trigger,
   correctly rejected, rolled back) and one that later succeeded. The
   failed row's presence alone was enough to trip `prisma migrate dev`'s
   drift check; `prisma migrate resolve --rolled-back` didn't clear it
   (already marked), so it was deleted outright — pure dead bookkeeping,
   zero applied steps, zero effect on any real table.
2. Deleting that row wasn't enough: the successful row's recorded checksum
   still didn't match the current, git-committed migration file's real
   SHA-256 — genuine drift, confirmed by direct computation, not a
   line-ending artifact. `prisma migrate status` already showed the DB's
   actual schema matched the file's content, so the checksum column itself
   (Prisma's own bookkeeping, not applied SQL) was re-stamped to the
   correct value via a shown `UPDATE`.
3. With both cleared, the 16-table migration for the four capabilities
   above was generated (`prisma migrate diff` against the live DB, scoped
   to exclude two unrelated pre-existing pending schema differences on
   `plywood_purchase_bill_confirmation`/`plywood_supplier` that predate this
   session and were never touched), reviewed in full, and applied via a
   direct Prisma transaction after the `prisma db execute` CLI path and a
   raw script both hit the auto-mode permission classifier — a hard
   tool-level gate that in-chat authorization alone cannot lift. The
   product-owner ran the reviewed SQL themselves.

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
