# Task 91 — Bulk operations & partial-failure UX

Authority: User synthesis, 2026-09-03, items 6–7. `taskplans/82_erpclaw_
client_capability_builder_skill.md` (anti-pattern addendum already points
here).

## Status: BUILT 2026-09-04 — `src/server/platform/batch.ts`
(`runCommandBatch`, `BatchResult`/`BatchOutcome`), wired into
`agent-chat.ts`'s tool loop as its first consumer (trigger fired: Task 84
landed first). Unit-tested in `src/test/command-runtime.test.ts`
("runCommandBatch (Task 91)") — verified live against the DB 2026-09-04
(18/18 passing after an unrelated transient Supabase connectivity issue
cleared); typecheck and lint clean.

## What's missing

Two tightly-coupled pieces neither of which exist today:

1. **Bulk UX**: select N → review N (preview, per Task 81 rule 8 step 3,
   applied to a set) → execute → show successes/failures **individually**,
   not a single pass/fail verdict for the whole batch.
2. **Partial-failure handling**: if an AI agent (Task 84) or an import
   (Task 87) processes 50 records and 46 succeed, 3 fail validation, and 1
   needs approval — the 46 stay committed. The system surfaces the
   remaining 4, clearly separated by *why* they didn't complete, rather
   than rolling everything back over one bad row or silently dropping the
   failures.

## Scope

- A shared shape for "batch result": per-item outcome (`succeeded` /
  `failed: <reason>` / `needs_approval`), not a single boolean. BUILT as
  `BatchOutcome<TResult>`/`BatchResult<TResult>` in `batch.ts`.
- Each individual operation still goes through `executeCommand`'s normal
  one-transaction-per-command pipeline (`command.ts`) — this is about how
  the *caller* (bulk UI, import, agent) sequences and reports N calls, not
  about batching multiple business facts into one transaction. Confirmed:
  `runCommandBatch` loops and calls `executeCommand` once per item.
- Bonus, not originally scoped here but a direct consequence of reusing
  this for the agent: a destructive command (`impact: "destructive"`) is
  never executed through `runCommandBatch` unless the caller passes
  `confirmed: true`. The chat surface (area 6) has no confirm UI yet, so it
  never sets that flag — every destructive tool call from the agent comes
  back `needs_approval` rather than running blind. A future bulk-UI/import
  consumer decides its own confirmation flow and passes `confirmed`
  accordingly; this file's `runCommandBatch` does not build one for them.

## Trigger to start

Whichever lands first: Task 84's agent issuing multiple commands in one
turn, or Task 87's import committing multiple rows. Natural to build
alongside whichever of those starts first rather than standalone.

## Non-goals

- Not a change to `executeCommand`'s existing one-transaction-per-command
  guarantee — that stays correct and is the thing each item in a batch
  still goes through individually.
