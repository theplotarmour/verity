# Task 81 — Platform-level assistant operating rules (from ERPClaw)

Authority: `erpclaw-prd/05-verity-extraction-plan.md` §5 (ERPClaw source).
PRN-001 (least surprise / explainable automation), PRN-002 (progressive
disclosure).

## Status: PENDING — no Verity assistant/command-layer exists yet to apply this to

Unlike Tasks 72–80 (business capabilities), this is a set of **cross-cutting
interaction rules**, not a data model — cheaper to adopt once an assistant
surface exists, and worth deciding early since it shapes command/UI-copy
conventions platform-wide rather than one capability.

**Trigger to start:** whenever Verity gains an assistant/chat command layer
over the Command/Query runtime. Until then this is a design decision on
file, not code.

## 1. Live-record grounding

Before the assistant claims a tenant has a record, balance, order, invoice,
stock quantity, payment, or duplicate, it must query the relevant Verity
read model in the current turn. Workspace context and prior chat memory are
not authoritative for business records.

## 2. Exact legal-entity resolution

If an action posts into a tenant, organization, business profile, or client
legal entity, exact resolution is required. If not found, show available
exact names and ask the user to choose. Never autocorrect, fuzzy-match,
abbreviate, or pick "closest" (this generalizes plywood's owner/business
name-matching discipline already in place).

## 3. Business-language command layer

User-facing text says "send invoice", "record payment", "receive goods",
"close period", "add customer" — never the internal command key
(`verity.plywood.create_sales_order` stays a log/dev reference). Confirmation
dialogs describe consequences, not implementation commands.

## 4. Confirmation classes

Routine, clearly-authorized user actions execute without re-asking.
Destructive/high-impact actions require a second explicit confirmation:
deleting/restoring data, closing fiscal periods, changing credentials,
irreversible exports, schema/module operations, permanent cleanup, external
submissions.

## 5. Reversal over mutation

Submitted invoices, payment allocations, stock movements, GL entries, goods
receipts/issues, audit events, and evidence attachments are corrected
through reversals/addenda/adjustments — not just finance, every operational
ledger (extends INV-002's closed-state pattern beyond Work Orders).

## 6. Metadata-driven UI

Client modules declare pages, entities, fields, forms, tables, actions,
reports, status labels, permissions, and dashboard contributions as metadata
where practical (parallels ERPClaw's `UI.yaml`). Bespoke screens remain
allowed for domain-critical workflows; list/detail/form/report scaffolding
should be generated or convention-driven.

## 7. Assistant plus dashboard

Assistant is the fastest path for record creation, lookup, summaries, and
chained workflows. Dashboard is the audit/review/control surface. Every
assistant action has a visible record trail in the dashboard — no action
that only the assistant can see happened.

## Non-goals

- Not a spec for building the assistant itself — that's a separate,
  larger platform decision (missing ADR if picked up).
- Not retroactive to existing plywood UI, though plywood's current owner/
  business exact-match behavior already satisfies rule 2.
