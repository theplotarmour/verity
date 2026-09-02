# Task 88 — Reconciliation as a first-class, cross-capability pattern

Authority: User synthesis, 2026-09-03, item 3.

## Status: PENDING — genuinely new gap

## What's missing

Recorded reality and physical/financial reality diverge — that's not a bug
class, it's a permanent feature of running a business, and ERP systems
that survive treat it as one first-class shape rather than reinventing it
per domain: **Expected → Actual → Difference → Resolution → Audit.**

Plywood already has ONE instance of this (stock reconciliation, part of
Task 73's inventory scope) but not the general primitive. Other instances
this same shape would serve once they exist: expected vs. bank-statement
payment (ties to Task 87's bank reconciliation import), expected vs.
delivered shipment quantity, expected vs. actual attendance (once Task 78
HR exists).

## Scope

- Do NOT build a generic "reconciliation engine" speculatively. Extract
  the shared shape only once a second real instance exists alongside
  plywood's stock reconciliation — same governing rule as every other
  capability-to-platform-primitive promotion in this project.
- Until then: when building the second instance, build it *aware of* this
  pattern rather than as an unrelated one-off, so the eventual extraction
  isn't a rewrite.

## Trigger to start

A second reconciliation need (bank statement import, most likely, per
Task 87).

## Non-goals

- Not a mandate to generalize plywood's existing stock reconciliation now.
