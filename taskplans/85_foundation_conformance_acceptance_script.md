# Task 85 — Foundation conformance / day-one acceptance script

Authority: `erpclaw-prd/00-product-vision.md` §8 (Success Metrics).

## Status: BUILT 2026-09-04 — template established and used twice.
`implementation/13-conformance/acceptance-plywood.md` (retrospective, walked
against the shipped capability, **PASS**) and `acceptance-accounting.md`
(written the same session the capability was built, **PENDING** — not yet
walked live against a real tenant, marked honestly rather than assumed).
One script per capability going forward, per this file's own scope.

## What's missing

A concrete, runnable day-one script: create workspace → configure
defaults → create first master records (customer/item/supplier) → perform
a first transaction → complete it → view the resulting report → verify
the audit trail — "without leaving the product model." Verity has
per-task acceptance checklists (see Task 71's "Delivered" table) but no
single standing script that certifies a *capability*, end to end, the way
this would.

## Scope

- One script per capability (plywood's version already exists implicitly
  across Tasks 47–71; this would make it an explicit, re-runnable
  checklist rather than something reconstructed from commit history).
- Doubles as the certification bar `erpclaw-prd/04-optional-modules-and-
  expansion.md` §8 describes for a module before it's "usable" — adapted:
  a capability isn't foundation-ready-adjacent until its script passes.

## Trigger to start

The next capability (plywood's own retrofit, or a second client) — cheap
to write in retrospect for plywood now, more valuable written *before* the
second capability so it's a template, not an afterthought.

## Non-goals

- Not a replacement for Playwright/vitest test suites — this is a
  human-readable acceptance script, not an automated test (though nothing
  stops one from becoming the other later).
