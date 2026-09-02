# Task 92 — Business timeline (per-entity unified history)

Authority: User synthesis, 2026-09-03, items 5 and 10 (the same idea,
given twice — "complete history, not just current state" and "business
timeline" — merged here).

## Status: PENDING — presentation-layer gap over infrastructure that may
already substantially exist. Check before building.

## What's likely already there

`taskplans/38_audit_business_history.md` is marked DONE in the status
index ("Status: COMPLETE — BUILT and PROVEN"). Before treating this as new
work, read what Task 38 actually built — this may be a UI/presentation
gap over already-built data (audit rows, domain events with
`correlationId`), not a missing data model.

## What the user is asking for, concretely

Not raw audit rows or a generic events list — a narrative, per-entity
timeline a human reads top to bottom: *09:42 Order created · 09:45 Credit
approved · 10:03 Material reserved · 11:20 Shipment created · 14:15
Dispatched · 18:42 Delivered · 19:05 Invoice raised.* For any entity that
has one: customer, order, shipment, employee, invoice, asset.

## Scope, once Task 38's actual output is confirmed

- A rendering layer over existing `domainEvent`/audit rows, grouped and
  captioned in business language (Task 81 rule 3's vocabulary applied to
  history, not just live actions).
- Not a new event/audit data model — Task 38 already owns that.

## Trigger to start

Read Task 38's implementation first. If it already exposes something
close to this, this task shrinks to "build the timeline component"; if
it's genuinely audit-log-shaped only, this stays a real gap.
