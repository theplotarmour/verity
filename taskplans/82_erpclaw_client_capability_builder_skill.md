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

**2026-09-03 addendum — six more rules, from the user's own ERPClaw
synthesis rather than the source doc, additive to the list above:**

- Every capability declares its own business invariants explicitly (e.g.
  "stock cannot go negative unless the capability opts in," "a settled
  invoice cannot become editable") and enforces them at the command/DB
  layer — never trusted to the UI alone.
- Every externally- or automatically-triggered command (webhook, cron,
  AI-issued, or a user's accidental double-click) needs a safe-retry story
  so it cannot duplicate the business event it represents. Not every
  command needs this — only ones a retry can plausibly reach.
- Model data as master (customer, item, warehouse), transactional (order,
  receipt, invoice, payment), or derived (outstanding balance, margin,
  current stock) — and treat derived data as computed, never stored as if
  it were a fact of its own.
- State who controls each piece of configuration before adding it:
  platform-controlled (capability licensing, platform security),
  client-controlled (tax rates, credit policy), role-controlled (approval
  thresholds), or system-derived (current balance, KPIs) — a settings
  screen with no owner named for each field is how it becomes a dumping
  ground.
- State the capability's **business lifecycle** before decomposing it into
  commands — e.g. plywood's `Catalogue → Purchase → Receive → Stock →
  Sale → Reserve → Dispatch → Deliver → Invoice → Payment → Margin`. The
  lifecycle is what reveals which platform primitives are reused, which
  commands/states/reports are actually required, and what's missing —
  writing "needs purchase orders" without it skips the step that would
  have surfaced the gap.
- Prefer retiring a reference/registry value over deleting it whenever
  historical records depend on it — this is ADR-009's lifecycle-over-
  deletion rule (already listed above for business records) applied one
  layer down, to the lookup values a capability defines for itself: tax
  categories, payment terms, units, status labels.

## Skill output checklist (per new capability)

Capability status statement; requirement-to-platform-primitive map; scope
boundaries and non-goals; domain model; state machines; commands; queries;
permissions; dashboard contributions; UI routes and page sections; migration
plan; seed/demo plan; test plan; acceptance checklist; open decisions;
implementation summary with exact files changed.

**2026-09-03 addendum, second round — three more required items, from the
user's own synthesis:**

- **Source-of-truth map.** For every important number the capability
  surfaces, state exactly where it comes from — "stock reads from the
  movement ledger, never `product.stock`," "receivable is invoices minus
  payments, never a maintained balance field." Prevents the specific bug
  class where a cached/duplicated number quietly drifts from the ledger
  that's supposed to be authoritative for it.
- **Happy path + exception path, named separately, per workflow.** Not
  just the state machine (already required above) but the explicit
  branch: `Purchase → Receive → Stock` happy path, then short receipt /
  damaged goods / rejected goods / duplicate receipt as named exceptions
  — each with its own handling, not left to fall through to whatever the
  happy path does with bad input.
- **The business event before the report.** Don't design a report
  ("profit this month") before the domain model settles what exactly
  counts as revenue, cost, settlement, and returns for this capability.
  The report is a read over already-agreed facts, not a reason to
  retroactively decide what the facts are.

## Skill anti-patterns (do not let an agent do these)

"Navigation hiding is authorization." / "One client's need means platform
primitive." / "JSON blob instead of a table for queryable line items." /
"Direct ledger row writes from UI." / "Updating submitted financial facts in
place." / "Assuming a customer/supplier/item exists from chat memory." /
"Using action keys as visible product copy." / "Adding a fake generic pack
name before a real pack exists." / "Calling docs complete because the
worktree is clean." / "Weakening RLS or bypass guards to make tests pass."

**2026-09-03 addendum — four more, sharper and more mechanical, from
`erpclaw-prd/04-optional-modules-and-expansion.md` §7 (module governance),
additive to the list above:**

"Integer autoincrement primary key for a business record" — Verity's own
identity shape is UUID-keyed throughout; an autoincrement id is the
specific, checkable symptom of a capability that wasn't built against the
platform's own primitives. / "A hardcoded CHECK constraint standing in for
a value a registry should own" — the same mistake as a hardcoded enum,
one layer lower, in the schema instead of the code. / "An unprefixed table
name that could collide with a future platform table" — capability-private
tables need a namespace a human reviewer can verify at a glance, not
"probably fine for now." / "A destructive action shipped without a
confirmation class" — the mechanical check for rule 4/4a in Task 81:
every command that deletes, restores, rolls back, or generates an external
file needs its impact class set, not assumed.

**Two more, from the same user synthesis:** "A deprecated write path that
just gets hidden from the UI" — a retired direct-write gateway must
actively refuse and name the supported replacement, since an API a UI
merely stopped calling is still callable. / "One giant transaction that
either fully succeeds or fully fails for a bulk/imported/AI-issued batch"
— see Task 91: a batch of N operations should preserve the ones that
succeeded and surface the ones that didn't, individually, not roll the
whole batch back over one bad row.

## Non-goals

- Not a generic ERP-building skill — every rule above is Verity-specific and
  cites this repo's own authority docs, not generic engineering knowledge.
- Not a replacement for reading the actual authority docs — the skill points
  to them, it doesn't duplicate their content.
