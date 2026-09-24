# Task Plan 122 — Phase-Wise Plan for Completing All Pending Taskplans

**Authority:** User synthesis, 2026-09-24 — direct follow-up to Task 121
(priority order across active work + Tasks 118/119/120) and
`taskplans/handoffs/README.md` (live work order). Re-derives and extends
Task 121 §2's priority list into concrete phases, verified live against
`00_STATUS_INDEX.md`, `handoffs/README.md`, `eslint.config.mjs`, and
current `git status` as of 2026-09-24 — not re-typed from memory.

## Status: PROPOSED — sequencing doc, not new scope

This is a pointer and an ordering, the same posture as
`101_remaining_work_master_plan.md` and Task 121 §2. It creates no new
requirements and supersedes nothing; it sequences work already scoped in
the taskplans it cites. Re-derive if stale, per this repo's own
staleness rule for sequencing docs.

## Verified starting state (2026-09-24)

- Task 121 §3.1 (ESLint gate on bare `<table>`) is **already landed**,
  uncommitted: `eslint.config.mjs` has `no-restricted-syntax` forbidding
  `JSXOpeningElement[name.name='table']` under `src/app/**` and
  `src/components/**`.
- 28 files still hand-roll `<table>`, grandfathered two different ways —
  inconsistency found live, not assumed:
  - 20 files exempted via the rule's `ignores` array in
    `eslint.config.mjs`.
  - 8 files exempted via an inline `/* eslint-disable no-restricted-syntax
    -- Task 121 grandfathered debt */` comment instead: `FinanceDesk.tsx`,
    `counter/page.tsx`, `reports/page.tsx`, `PurchaseDesk.tsx`,
    `TransactionsDesk.tsx`, `PriceSheet.tsx`, `BillableOrders.tsx`,
    `finance/[invoiceId]/InvoiceView.tsx`.
- `git status` at session start showed all 28 files plus
  `eslint.config.mjs`, `verity-spec/09_experience/design-system.md`, and
  `.claude/skills/verity-design-companion/SKILL.md` as modified and
  uncommitted — Task 121's own work, mid-flight.

## Phase 0 — close the in-flight commit

Reconcile the two exemption mechanisms to one (prefer the config
`ignores` array — single source of truth, doesn't require every
grandfathered file to carry a comment). Then commit per this repo's
standing workflow (commit continuously, push once at the end).

**Non-goal:** do not migrate any of the 28 files in this phase — that is
Phase 4.

## Phase 1 — Task 115 extension (top active priority)

Per `handoffs/README.md` "Active work, in order" #1: every new form,
dropdown, table, record view, and state uses the Apple/Odoo operational
grammar in `verity-spec/09_experience/design-system.md` §3. No page-local
control systems. Ongoing discipline, not a checklist with an end state —
re-check before every new UI surface, not once.

## Phase 2 — Task 121 §3.2: draft REQ text for the uncovered categories

Draft, then run through this repo's normal REQ ratification pass (same
process REQ-010..016 went through — not invented unilaterally):

- Per-row inline next-state action on a collection view (extends
  REQ-012).
- A required ledger/statement pattern for any entity with a counterparty
  relationship — generalizing `LedgerView.tsx`'s own pattern platform-wide
  via a shared query/component.
- Print/PDF path for any record meant to leave the system (invoice, PO,
  certificate) — not CSV export alone.
- Bulk actions, human-readable sequential numbering, notification-on-
  state-change.

**Sequencing note (from Task 121 itself):** do this only after Phase 0/4's
real migration list is settled — the lint rule already surfaced the true
28-file list; don't draft spec prose against a stale one.

## Phase 3 — Task 121 §3.3: wire `obvious-basics-checklist` into review

Make the skill a required pass before any new capability's screens ship,
plus a periodic (quarterly, or on capability-set change) sweep of the
full shipped surface — same enforcement posture already given to
`verity-adr-gate` and `verity-migration-safety`.

## Phase 4 — migrate the 28 grandfathered bare-table files

Mechanical, unblocked, no product-owner decision required. Swap each to
`DataTable`/`SmartTable`/`DynamicTable` (`src/components/ui/`), then
remove its `ignores` entry (or inline disable) and re-verify
`eslint . ` clean. Batch by area to keep diffs reviewable:

- **HQ admin (9):** `hq/audit/page.tsx`, `hq/page.tsx`,
  `hq/settings/page.tsx`, `hq/clients/page.tsx`,
  `hq/clients/[tenantId]/modules/ModulesAdmin.tsx`,
  `hq/clients/[tenantId]/organizations/OrganizationsAdmin.tsx`,
  `hq/clients/[tenantId]/people/PeopleAdmin.tsx`,
  `hq/clients/[tenantId]/roles/RolesAdmin.tsx`,
  `hq/clients/[tenantId]/settings/SettingsAdmin.tsx`
- **Shell desks (8):** `finance/FinanceDesk.tsx`,
  `purchases/PurchaseDesk.tsx`, `sales/SalesDesk.tsx`,
  `stock/StockBoard.tsx`, `transactions/TransactionsDesk.tsx`,
  `prices/PriceSheet.tsx`, `catalogue/CatalogueAdmin.tsx`,
  `menu/MenuAdmin.tsx`
- **Detail/record views (5):** `finance/[invoiceId]/InvoiceView.tsx`,
  `counter/[billId]/BillView.tsx`, `ledgers/LedgerView.tsx`,
  `floor/FloorPlan.tsx`, `import/ImportWizard.tsx`
- **Counter (2):** `counter/BillableOrders.tsx`, `counter/page.tsx`
- **Outreach (2):** `outreach/domains/[domainId]/page.tsx`,
  `outreach/intelligence/page.tsx`
- **Misc (2):** `overview/page.tsx`, `reports/page.tsx`

## Phase 5 — Task 116 (IN PROGRESS since 2026-09-19)

Apple quality visual UX completion program. Finish the full role/theme/
viewport evidence pass Phase 0 left open; continue Phase 1 past
`/overview`'s `HeroSignal`/`SignalRail` slice into remaining page
families. Direction already locked by the product owner: dark graphite,
subtle blue, no bloom, no persistent workspace pills.

## Phase 6 — Outreach launch verification remainder

Junior/Senior role sign-in smoke test against the real PA-OMS tenant.
**Blocked on product-owner credentials** — passwords were printed once to
the console at seed time (`prisma/seed-pa-oms.ts`) and were never
captured anywhere retrievable. Not an engineering blocker; cannot be
closed by an agent session alone.

## Phase 7 — watch only, do not pick up

Task 90 (Attention platform concept). Waits on a second, independently-
arrived-at instance of the same generalization need. Listed so it is not
re-derived or started prematurely.

## Phase 8 — blocked on explicit product-owner decision, not sequenced against 1-6

- **Task 118** (manufacturing capability, veda-vs-Odoo gap) — needs the
  same Task-84-style product-owner override that shipped `recipe`/
  `plywood`/`trading`.
- **Task 119** (Jev decision model as an `EdgeCondition` advisory layer)
  — needs an ADR on external decision-model dependency + tenant-data
  egress, or `CLAUDE.md`'s objective moving past PLATFORM FOUNDATION
  READY into business-capability build.
- **Task 120** (Relay integration) — Relay has no backend yet
  (marketing site only); needs the authenticated external-tool-invocation
  HTTP surface built in Verity first, plus the same foundation-vs-
  capability scope question as Task 118.

None of Phase 8 is actionable by engineering alone — surface to the
product owner, do not improvise a decision.

## Backlog — real trigger/ADR gated, no action possible now

Listed for completeness only, not sequenced: Tasks 74/75/76 (superseded
in large part by ADR-018; residual scope beyond `trading` stays open),
79 (needs Indian statutory PF/ESI/TDS research first), 80 (needs Task 72
settled + an enterprise consolidation client), 88/89 (trigger: a second
reconciliation / period-locking instance — unfired), `DocumentTemplate`
per Task 104's correction (trigger: a real document-generation
requirement — unfired), 95 phase 6 (needs its own future ADR), 99 Skill 6
(`verity-capability-boundary-check` — worth scoping once two developers
work in parallel, not before).

## Recommended immediate start

Phase 0 (commit) first — cheap, closes existing drift. Phase 4
(mechanical migration) can run in parallel with the standing discipline
of Phase 1/5; neither needs a product-owner decision. Phase 6/7/8 wait on
someone other than the agent.
