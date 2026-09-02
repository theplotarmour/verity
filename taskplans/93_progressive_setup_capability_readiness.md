# Task 93 — Progressive setup / capability readiness engine

Authority: User synthesis, 2026-09-03, item 12.

## Status: PENDING — genuinely new gap, platform-primitive-shaped

## What's missing

A new client should not see fifty configuration options at once. The
concrete shape, from the user's own plywood-specific example: **Company
details → Godown → Products → Suppliers → Customers → Pricing → First
purchase → First sale**, one step revealed at a time, each one aware of
whether it's actually done.

Generalizes to: "what does THIS capability need configured next before it
can operate" — a per-capability readiness sequence, not a hardcoded
plywood onboarding flow.

## Relationship to Task 85

Task 85 (foundation conformance script) *certifies* that a capability's
day-one flow works end to end, after the fact, for engineering. This task
is the *live, in-product* version a new tenant actually walks through.
Related, not the same artifact — Task 85 could reasonably be written
first and this task's step sequence derived from it.

## Scope

- Same "requires ADR before generalizing" caution as Tasks 88–90: build
  plywood's own onboarding sequence concretely first (if/when it's
  needed) before extracting a reusable "Capability Readiness Engine."
  This is explicitly the biggest platform-primitive-shaped item on this
  list and the one most likely to be over-built if started as a generic
  engine rather than a second real instance.

## Trigger to start

The next tenant onboarding for plywood (or a second client) that isn't a
developer running the seed script.

## Non-goals

- Not a mandate to build a generic engine now. One real, concrete
  instance first.
