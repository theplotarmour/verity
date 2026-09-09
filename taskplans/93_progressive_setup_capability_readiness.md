# Task 93 — Progressive setup / capability readiness engine

Authority: User synthesis, 2026-09-03, item 12.

## Status: BUILT 2026-09-09 (mostly already existed, unnoticed)

Trigger fired: Shree Ganesh Timber Trading Co. is Verity's one real client
(confirmed 2026-09-09) — this file's own trigger, "the next tenant
onboarding for plywood that isn't a developer running the seed script,"
already applies to it.

**What was already built, before this session touched it** — Task 59
(`c22c491`, pre-dating this taskplan's own PENDING status and never
checked against it): `onboardingChecklist`
(`src/server/capabilities/trading/business.ts`) computes real done/blocked
state per step from live counts, and `SetupChecklist.tsx`
(`src/app/(shell)/overview/`) renders it on `/overview` — one step
highlighted as "Start here," done steps checked off, blocked steps show
what they need first. This already delivers the concrete ask in full:
"one step revealed at a time, each one aware of whether it's actually
done," built specifically for plywood, not a generic engine (exactly this
file's own non-goal).

**What this session added**, the two named steps the built version was
missing against the spec's eight (`Company details → Godown → Products →
Suppliers → Customers → Pricing → First purchase → First sale`): `pricing`
(done when a `TradingSupplierPrice` or `TradingCustomerPrice` row exists)
and `first_sale` (done when a `TradingSalesOrder` exists), both reusing
the same handler shape and counts already computed for the other six
steps — no new primitive, no new table.

## Original ask (now built, kept for the record)

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
