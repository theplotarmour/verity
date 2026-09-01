# Task 82 — `verity-client-capability-builder` skill (tooling, near-term value)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §6, §7 (ERPClaw
source). `CLAUDE.md` §Foundation-ready definition (a capability must be
addable "without modifying unrelated platform infrastructure").

## Status: PENDING — highest-value extraction of the set, but still deferred to Phase 2 of the source doc's own rollout

Unlike Tasks 72–80, this is **tooling**, not a business capability — it
teaches any future agent (Claude Code, Codex) to build a Verity client
capability correctly on the first attempt, using this project's authority
model instead of generic ERP knowledge. That directly serves foundation
readiness ("a new capability can be registered... without redesign") even
though it produces no capability itself.

**Trigger to start:** per the source doc's own Phase 2, install this before
the *next* large client-module implementation — i.e., whenever Task 72–80
(or an unrelated new client) is actually greenlit, not before. Installing it
speculatively with no capability to build next has nothing to validate
against.

## Skill name

`verity-client-capability-builder`

## Purpose

Guide an agent to build Verity client capabilities using the project
authority model, current implementation patterns, ERPClaw extraction
lessons, and Verity security constraints.

## Trigger examples (for the skill's own frontmatter, once written)

"Build a new Verity client module." / "Extract this client requirement into
Verity." / "Implement a plywood-like module." / "Add ERP/accounting/
inventory/sales/buying/payments capability." / "Turn this PRD into Verity
capability code." / "Use ERPClaw architecture for Verity." / "Audit whether
this should be platform or client capability."

## Required context-loading order (for the skill body)

1. Root `README.md` for current authority order.
2. `CLAUDE.md` for project rules and the Experience System design authority.
3. Foundation build-priority state (what's actually built vs. planned).
4. Relevant `taskplans/17A`–`22` authority docs for platform/capability/
   entity/state/permission/data rules.
5. Existing shipped capability closest to the task — currently
   `src/server/capabilities/plywood/` is the only real example; also check
   `src/server/capabilities/location/`.
6. Relevant client design docs (`plywood.md`, `KentsRestaurant.md`,
   `clinic.md`, `salon.md`, `coaching.md`) and `erpclaw-prd/`.

## Skill rules (carried over from source doc, Verity-worded)

- Treat Verity's database and code as authority for current behavior.
- Distinguish current, partial, planned, demonstrated, target, and
  built/proven behavior (matches `CLAUDE.md` §Reporting vocabulary exactly).
- Keep client modules capability-private unless at least two real clients
  prove reuse.
- Do not broaden platform core to satisfy one client.
- Preserve RLS and fail-closed security guards (INV-001, `withTenant()`).
- Register capability definitions, entity definitions, commands, queries,
  workspace contributions, and migrations through established patterns —
  never a bypass.
- Use integer minor units for money in Indian client modules.
- Snapshot product names, HSN/tax codes, prices, discounts, tax rates,
  customer/supplier names, and commercial terms on submitted documents.
- Use append-only ledgers for stock/accounting/payment history.
- Use lifecycle states instead of deleting historical business records
  (ADR-009).
- Use reversals, addenda, allocations, and adjustment entries instead of
  editing submitted facts.
- Hide internal command keys from user-facing UI (Task 81 §3).
- Use semantic design tokens; never hardcode dark text classes that fail in
  dark mode (Experience System, ADR-011/012).
- Keep dense operational tables scrollable and legible.
- Add tests before claiming built/proven.

## Skill output checklist (per new capability)

Capability status statement; requirement-to-platform-primitive map; scope
boundaries and non-goals; domain model; state machines; commands; queries;
permissions; dashboard contributions; UI routes and page sections; migration
plan; seed/demo plan; test plan; acceptance checklist; open decisions;
implementation summary with exact files changed.

## Skill anti-patterns (do not let an agent do these)

"Navigation hiding is authorization." / "One client's need means platform
primitive." / "JSON blob instead of a table for queryable line items." /
"Direct ledger row writes from UI." / "Updating submitted financial facts in
place." / "Assuming a customer/supplier/item exists from chat memory." /
"Using action keys as visible product copy." / "Adding a fake generic pack
name before a real pack exists." / "Calling docs complete because the
worktree is clean." / "Weakening RLS or bypass guards to make tests pass."

## Non-goals

- Not a generic ERP-building skill — every rule above is Verity-specific and
  cites this repo's own authority docs, not generic engineering knowledge.
- Not a replacement for reading the actual authority docs — the skill points
  to them, it doesn't duplicate their content.
