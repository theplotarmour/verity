# Task 89 — Period locking, generalized

Authority: User synthesis, 2026-09-03, item 4. `taskplans/52_plywood_
close_reports.md` (already built — plywood's own period close).

## Status: PENDING — additive-scale gap: the pattern exists once (plywood
finance), not yet as a reusable shape

## What's missing

Not every historical record should stay endlessly mutable forever.
Plywood's finance capability already has this (Task 52, period close).
The generalization other capabilities would eventually want the same
shape for: a locked payroll period (once Task 79 exists), a finalized
inventory count, a frozen reporting period — in each case, corrections
after lock happen through an explicit adjustment, never by editing
history (same family as ADR-009 and Task 81 rule 5, applied to a *time
window* rather than a single record's lifecycle state).

## Scope

- Do not extract a generic "period" primitive speculatively. Same rule as
  Task 88: build the second real instance aware of plywood's existing
  close pattern; extract only once two real instances exist.

## Trigger to start

Whichever of payroll (Task 79), a second finance-heavy client, or an
inventory-count-finalization need lands first.

## Non-goals

- Not a mandate to touch plywood's already-built, already-proven period
  close (Task 52).
