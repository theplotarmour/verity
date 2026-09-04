---
name: verity-client-capability-builder
description: Use when building, extracting, or auditing a Verity client or platform capability — a new business module (accounting, inventory, selling, buying, payments, billing, HR, payroll, or any future domain) that plugs into the existing Command/Query/State/Event runtime. Triggers include "build a new Verity client module", "extract this client requirement into Verity", "implement a plywood-like module", "add ERP/accounting/inventory/sales/buying/payments capability", "turn this PRD into Verity capability code", "use ERPClaw architecture for Verity", "audit whether this should be platform or client capability". Not for platform-core changes (tenancy, auth, command runtime itself), not for frontend-only work (use impeccable), not generic ERP-building.
license: Apache 2.0
---

Authority: `taskplans/82_erpclaw_client_capability_builder_skill.md` (this
skill's own source spec). Every rule below cites this repo's own authority
docs, never generic ERP or SaaS knowledge — that split is the whole point:
a capability built from this skill should look like it belongs next to
`src/server/capabilities/plywood/` and `src/server/capabilities/asset/`,
not like it was copied from a tutorial.

## Required context-loading order

Read these, in this order, before writing a line of capability code:

1. Root `README.md` — current authority order.
2. `CLAUDE.md` — project rules and the Experience System design authority.
3. `CLAUDE.md` §Build priority — what's actually built vs. planned, so the
   capability doesn't assume infrastructure that doesn't exist yet.
4. The relevant `taskplans/17A`–`22` authority docs for whatever the
   capability touches: platform/capability/entity/state/permission/data
   rules.
5. The existing shipped capability closest to this task. In order of
   maturity: `src/server/capabilities/plywood/` (deepest — catalogue,
   stock, trading, finance, tax, reports), `src/server/capabilities/
   accounting/`, `inventory/`, `hr/`, `billing/` (each a real MVP slice),
   `src/server/capabilities/asset/` or `location/` (smallest, cleanest
   skeleton to copy the shape of a brand-new capability from).
6. Relevant client design docs (`plywood.md`, `KentsRestaurant.md`,
   `clinic.md`, `salon.md`, `coaching.md`) and `erpclaw-prd/`, if the
   capability traces to one of them.

## Before writing code: state the lifecycle, not the commands

Write the capability's business lifecycle first — e.g. plywood's
`Catalogue → Purchase → Receive → Stock → Sale → Reserve → Dispatch →
Deliver → Invoice → Payment → Margin`. The lifecycle is what reveals which
platform primitives are reused, which commands/states/reports are actually
required, and what's missing. "Needs purchase orders" without the lifecycle
skips the step that would have surfaced the gap.

## Rules (non-negotiable, carried from Task 82's source spec)

- Verity's database and code are authority for current behavior — not this
  skill's memory of a previous session, not a training-data ERP pattern.
- Distinguish BUILT / PROVEN / DEMONSTRATED / NOT YET BUILT exactly per
  `CLAUDE.md` §Reporting vocabulary. Never report a hypothetical as shipped.
- Keep client modules capability-private unless at least two real clients
  prove reuse. "One client's need means platform primitive" is the
  anti-pattern, not the default.
- Do not broaden platform core (`src/server/platform/`) to satisfy one
  capability. If the capability seems to need that, stop — that's a
  platform decision, not a capability one.
- Preserve RLS and fail-closed security guards (INV-001, `withTenant()`).
  Every new table gets `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL
  SECURITY` + a tenant-isolation policy in its migration, no exceptions.
- Register everything through the established patterns — capability
  definitions, entity definitions, commands, queries, workspace
  contributions, migrations — never a bypass. Direct table writes outside
  `executeCommand` are a defect, not a shortcut.
- Money is integer minor units, always — see `prisma/schema.prisma`'s own
  "MONEY IS INTEGER MINOR UNITS" comment block for the convention every
  existing capability already follows.
- Snapshot product names, HSN/tax codes, prices, discounts, tax rates,
  customer/supplier names, and commercial terms onto submitted documents —
  never re-derive them later from a mutable master record.
- Use append-only ledgers for stock/accounting/payment history — see
  `journal_entry`/`journal_line` (accounting) and `inventory_stock_movement`
  for the pattern: `ENABLE ROW LEVEL SECURITY` + a
  `BEFORE UPDATE OR DELETE ... EXECUTE FUNCTION verity.reject_mutation()`
  trigger, SELECT + INSERT-only RLS policies.
- Use lifecycle states instead of deleting historical business records
  (ADR-009). A wrong fact is corrected by a new fact (reversal, decision,
  amendment), never by editing or deleting the old one.
- Hide internal command keys from user-facing UI (Task 81 §3) — a command
  key like `verity.accounting.post_journal_entry` is an implementation
  detail, never product copy.
- Use semantic design tokens for any UI; never hardcode dark-mode-hostile
  text classes (Experience System, ADR-011/012) — load `impeccable` before
  writing any capability UI.
- Keep dense operational tables scrollable and legible.
- Add tests before claiming BUILT/PROVEN.

### Six more, from the 2026-09-03 synthesis

- Every capability declares its own business invariants explicitly (e.g.
  "stock cannot go negative unless the capability opts in," "a settled
  invoice cannot become editable") and enforces them at the command/DB
  layer — never trusted to the UI alone.
- Every externally- or automatically-triggered command (webhook, cron,
  AI-issued, or a user's accidental double-click) needs a safe-retry story
  so it cannot duplicate the business event it represents. Not every
  command needs this — only ones a retry can plausibly reach. See
  `billing`'s `generateInvoiceForMeter`: idempotent by a DATABASE unique
  constraint, not an application check.
- Model data as master (customer, item, warehouse), transactional (order,
  receipt, invoice, payment), or derived (outstanding balance, margin,
  current stock) — treat derived data as computed, never stored as if it
  were a fact of its own.
- State who controls each piece of configuration before adding it:
  platform-controlled, client-controlled, role-controlled, or
  system-derived. A settings screen with no named owner per field is how it
  becomes a dumping ground.
- State the business lifecycle before decomposing into commands (see
  above — promoted to its own section because it's load-bearing).
- Prefer retiring a reference/registry value over deleting it whenever
  historical records depend on it (ADR-009's rule, one layer down: tax
  categories, payment terms, units, status labels).
- When a field can genuinely be "we don't know yet" as a distinct state
  from "the value is empty" (Task 94 — a customer's GSTIN, a delivery
  confirmation, a credit rating), don't overload the value field with a
  sentinel and don't force it required before the business actually knows.
  Add a companion `Select`-type custom field for the status (`Unknown` /
  `Not applicable` / `Verified` / etc.) alongside the value field — the
  existing `CustomFieldSchema`/`CustomFieldType` machinery already covers
  this, no new platform primitive needed.

## Skill output checklist, per new capability

Capability status statement; requirement-to-platform-primitive map; scope
boundaries and non-goals; domain model; state machines; commands; queries;
permissions; dashboard contributions; UI routes and page sections; migration
plan; seed/demo plan; test plan; acceptance checklist; open decisions;
implementation summary with exact files changed.

Three more, required per the 2026-09-03 synthesis:

- **Source-of-truth map.** For every important number the capability
  surfaces, state exactly where it comes from — "stock reads from the
  movement ledger, never `product.stock`," "receivable is invoices minus
  payments, never a maintained balance field." This is the specific bug
  class where a cached/duplicated number quietly drifts from the ledger
  that's supposed to be authoritative for it.
- **Happy path + exception path, named separately, per workflow.** Not just
  the state machine — the explicit branch. `Purchase → Receive → Stock`
  happy path, then short receipt / damaged goods / rejected goods /
  duplicate receipt as named exceptions, each with its own handling.
- **The business event before the report.** Don't design a report ("profit
  this month") before the domain model settles what exactly counts as
  revenue, cost, settlement, and returns. The report is a read over
  already-agreed facts, not a reason to retroactively decide what the facts
  are.

## Anti-patterns — refuse these outright

"Navigation hiding is authorization." / "One client's need means platform
primitive." / "JSON blob instead of a table for queryable line items." /
"Direct ledger row writes from UI." / "Updating submitted financial facts
in place." / "Assuming a customer/supplier/item exists from chat memory." /
"Using action keys as visible product copy." / "Adding a fake generic pack
name before a real pack exists." / "Calling docs complete because the
worktree is clean." / "Weakening RLS or bypass guards to make tests pass."

Four more, mechanical and checkable:

"Integer autoincrement primary key for a business record" — Verity is
UUID-keyed throughout; an autoincrement id is the specific, checkable
symptom of a capability that wasn't built against the platform's own
primitives. / "A hardcoded CHECK constraint standing in for a value a
registry should own" — the same mistake as a hardcoded enum, one layer
lower, in the schema instead of the code. / "An unprefixed table name that
could collide with a future platform table" — capability-private tables
need a namespace a human reviewer can verify at a glance (`account`,
`inventory_item`, `hr_employee`, `billing_meter` — every table this session
added is prefixed or, for accounting, deliberately scoped to names nothing
else in the schema claims). / "A destructive action shipped without a
confirmation class" — every command that deletes, restores, rolls back, or
generates an external file needs `impact: "destructive"` set on its
`CommandDefinition`, not assumed.

Two more:

"A deprecated write path that just gets hidden from the UI" — a retired
direct-write gateway must actively refuse and name the supported
replacement; an API a UI merely stopped calling is still callable. / "One
giant transaction that either fully succeeds or fully fails for a bulk/
imported/AI-issued batch" — see Task 91's `runCommandBatch`
(`src/server/platform/batch.ts`): a batch of N operations preserves the
ones that succeeded and surfaces the ones that didn't, individually, never
rolling the whole batch back over one bad row.

## Non-goals

- Not a generic ERP-building skill — every rule above cites this repo's own
  authority docs, not generic engineering knowledge.
- Not a replacement for reading the actual authority docs — this skill
  points to them, it doesn't duplicate their content.
- Not a design skill — load `impeccable` separately for any UI this
  capability needs.
