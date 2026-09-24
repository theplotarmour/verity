# Task Plan 121 — Permanent Obvious-Basics Enforcement + Current Priority Order

**Authority:** User synthesis, 2026-09-23 — direct follow-up to Task 118
(veda-vs-Odoo audit) and the `obvious-basics-checklist` skill, asking for
(a) priority order across all pending taskplans and (b) a **permanent**
fix for the same class of gap veda had, verified live against Verity's own
shipped code, not assumed to already be solved by the design-system spec.

**Status:** PROPOSED — priority ordering is immediately actionable (no
blocking decision); the enforcement mechanism in §3 needs a short go-ahead
before the ESLint rule ships (it will fail the build on 28 existing files
until they're migrated — sequencing matters, see §3.3).

---

## 1. The honest finding: this already recurs, live, today

Verity is **not** starting from zero the way veda was. A real shared
component layer exists and is good:

- `src/components/ui/business/SmartTable.tsx` — built-in `EmptyState`,
  `overflow-x-auto` wrapper, `onRowClick` (drill-in), keyboard-safe rows.
- `src/components/ui/DataTable.tsx`, `DynamicTable.tsx` — same family.
- `src/app/(shell)/ledgers/LedgerView.tsx` — a real customer/supplier
  running-balance ledger with per-entry drill detail. This is exactly the
  "obvious basic" veda's own audits (Task 118 §1) flagged as its single
  biggest missing report. **Verity already has it, generalized across
  customer and supplier in one view.** Worth stating plainly: this is
  ahead of where veda ever got.
- `verity-spec/09_experience/design-system.md` §3 ("Operational
  Interaction Grammar," REQ-EXPERIENCE-DESIGNSYSTEM-010..016) already
  codifies most of the `obvious-basics-checklist` categories as ratified
  spec requirements — collection-view grammar (REQ-012: empty state,
  pagination, sorting, filter), form-control shape (REQ-013), commit/
  cancel/confirm (REQ-015), loading/empty/degraded/denied/error states
  (REQ-016). This is a real, working instance of "make it a rule, not a
  vibe" — more mature than veda ever had.

**But the enforcement is convention, not a gate — and it has already
drifted**, verified this session, not assumed:

- `grep -rln "SmartTable\|DataTable" src/app` — **13 files** compose the
  shared component.
- `grep -rl "<table" src/app` (excluding the shared components
  themselves) — **28 files** hand-roll their own `<table>` markup instead.
  Most of these do remember the `overflow-x-auto` wrapper by hand
  (`FinanceDesk.tsx:292`, `PurchaseDesk.tsx:318`, `SalesDesk.tsx:327`,
  `StockBoard.tsx:298/408`, `TransactionsDesk.tsx:193`,
  `PriceSheet.tsx:266`) — so the team is disciplined, not careless.
- **The exact veda bug reproduced anyway**: `LedgerView.tsx` — the very
  screen singled out above as Verity's strength — has **two** hand-rolled
  tables in the same file. One (line 684, the tenant-wide ledger list,
  `min-w-[640px]`) has the `overflow-x-auto` wrapper. The other (line 232,
  the single-party detail ledger, 4 columns: Date/Particulars/amount/
  Balance) does **not**. This is a narrower table and may not visibly
  clip on most phones today — flagged as inconsistency, not a confirmed
  user-visible break, in the interest of not overclaiming — but it is the
  identical pattern `VEDA_Module_Depth_And_UX_Plan.md` §2 found in
  `InventoryClient.tsx` ("7 of 9 tables wrapped, 2 not, in the same
  file"): careful by hand in most places, silently skipped in one, with
  no mechanism that would have caught it before merge.

**The lesson, stated once and meant permanently**: a spec section and a
good shared component are necessary but not sufficient. Nothing currently
stops a screen from bypassing both, and the evidence above shows that
happens even on a well-disciplined team, even on the flagship screen. A
"permanent and sincere" fix has to close that gap structurally, not by
writing a better checklist and hoping it gets run.

## 2. Priority order — pending work, right now

Combining `taskplans/handoffs/README.md` ("Active work, in order," last
updated 2026-09-18) with Tasks 118/119/120 opened this session. This is
the actionable order; re-derive from `handoffs/README.md` directly if this
document is more than a few weeks old, per that file's own staleness rule.

1. **Task 115 extension — Apple/Odoo operational interaction grammar
   rollout** (already active, per `handoffs/README.md` #1). This task's
   own scope already IS the mechanism this document extends — §3 below is
   additive to it, not a competing effort. Do not start a second,
   parallel "basics" initiative; fold §3 into this one.
2. **This document's §3 (enforcement gate)** — cheap, mechanical, no
   product-owner decision required, directly strengthens item 1. Do this
   next, before more screens are built that could drift the same way.
3. **Outreach launch verification remainder** (`handoffs/README.md` #2) —
   Junior/Senior role sign-in smoke test, blocked on credentials only the
   product owner holds. Not an engineering blocker.
4. **Task 90 — Attention platform concept** — watch only, not active
   work; do not pick up until its stated trigger (a second independent
   instance of the same need) fires.
5. **Tasks 118 (Manufacturing capability), 119 (Jev), 120 (Relay
   integration)** — all PROPOSED/DRAFT, each blocked on an explicit
   product-owner scope/ADR decision named in its own §6/"Why this is
   gated" section. Not sequenced against 1-4 above; they wait on a
   decision, not on engineering bandwidth.

## 3. The permanent fix — three parts, in order

### 3.1 Structural: make the shared component the only path

Add a `no-restricted-syntax`-class ESLint rule (or a small custom rule)
forbidding a literal `<table` JSX element anywhere under `src/app/**` and
`src/components/**` **except** inside the shared table components
themselves (`DataTable.tsx`, `SmartTable.tsx`, `DynamicTable.tsx`) and any
file explicitly listed in a short, reviewed allowlist (for a genuine
one-off shape the shared components can't yet express — the allowlist
entry must say why, per this repo's own "never fill a gap silently" rule).

This is the difference between "the pattern is documented" and "the
pattern is the only way to compile." It converts every future obvious-
basics table gap — for any capability, current or not-yet-built — from a
review-discipline question into a build failure, permanently, without
relying on anyone remembering to run a checklist.

### 3.2 Spec: close the categories §3 of design-system.md doesn't cover yet

REQ-010..016 do not yet name: per-row quick action, a required ledger/
statement pattern for any entity with a counterparty relationship, export/
print, bulk actions, human-readable sequential numbering, or a
notification-on-state-change requirement. These are exactly the
`obvious-basics-checklist` categories with no REQ-ID home yet. Proposed,
not yet drafted as REQ text (needs the same ratification process every
other REQ item in that file went through, not invented here unilaterally):

- A collection-view row with a lifecycle state exposes its next-state
  action inline, not only from a separate screen (extends REQ-012).
- Any entity with a counterparty relationship (customer, supplier,
  dealer, any future capability's "party-like" entity) gets a ledger/
  statement view — generalizing `LedgerView.tsx`'s own pattern platform-
  wide via a shared query/component, not left to each capability to
  reinvent or skip.
- A record meant to leave the system (invoice, PO, certificate) has a
  print/PDF path, not CSV-export alone.

### 3.3 Process: wire `obvious-basics-checklist` into review, not just audit

Run the skill as a required pass — the same enforcement posture this repo
already gives `verity-adr-gate` and `verity-migration-safety` — before any
new capability's screens ship, and periodically (e.g. once per quarter or
whenever a new client's capability set changes) against the full shipped
surface, not only when a client complains. The ESLint rule in §3.1 makes
the mechanical half permanent; this makes the judgment half (ledger
existence, per-row actions, print paths) a standing habit instead of a
one-time audit like this document.

### Sequencing note

§3.1 should land **before** §3.2 is drafted into ratified REQ text — the
lint rule will immediately surface every one of the 28 files above as a
migration item; better to see that real list before writing new spec
prose that might not match what the migration actually needs.

## 4. Non-goals

- Not a claim that all 28 hand-rolled tables are currently broken — most
  already carry `overflow-x-auto` by hand, correctly. The finding is
  about the *mechanism* (nothing prevents drift), evidenced by the one
  file where it already happened, not a claim of 28 live bugs.
- Not a rewrite of `design-system.md` §3 in this document — new REQ text
  needs its own ratification pass, this only names the gap.
- Not scoped to trading/plywood alone — the fix in §3.1 is capability-
  agnostic by construction (an ESLint rule on `src/app/**`), which is the
  point: it protects every current and future client's screens the same
  way, not just the ones audited this session.
