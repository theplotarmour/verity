# Task 91 — Bulk operations & partial-failure UX

Authority: User synthesis, 2026-09-03, items 6–7. `taskplans/82_erpclaw_
client_capability_builder_skill.md` (anti-pattern addendum already points
here).

## Status: PENDING — genuinely new gap

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
  `failed: <reason>` / `needs_approval`), not a single boolean.
- Each individual operation still goes through `executeCommand`'s normal
  one-transaction-per-command pipeline (`command.ts`) — this is about how
  the *caller* (bulk UI, import, agent) sequences and reports N calls, not
  about batching multiple business facts into one transaction.

## Trigger to start

Whichever lands first: Task 84's agent issuing multiple commands in one
turn, or Task 87's import committing multiple rows. Natural to build
alongside whichever of those starts first rather than standalone.

## Non-goals

- Not a change to `executeCommand`'s existing one-transaction-per-command
  guarantee — that stays correct and is the thing each item in a batch
  still goes through individually.
