---
doc_id: ENT-BILLABLE_OUTCOME
title: Entity — Billable Outcome
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Billable Outcome

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

**Capability/module:** `billing` · **Owner scope:** `tenant`

The record that something chargeable happened, received from another capability, before anybody has decided what it is worth.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `source_capability_key` | string | yes | yes | — | no | no |  |
| `source_ref` | uuid | yes | yes | — | no | no | the originating record, opaque here and resolved through the billable_outcome_sink port |
| `counterparty_ref` | uuid | yes | no | — | no | no | resolved through the party_directory port |
| `contract_ref` | uuid | no | no | — | no | no | resolved through the contract_terms port |
| `location_ref` | uuid | no | no | — | no | no |  |
| `occurred_at` | timestamptz | yes | yes | — | no | no |  |
| `quantity` | decimal | yes | no | — | no | no |  |
| `unit_of_measure` | string | yes | no | — | no | no |  |
| `rate_basis` | enum | yes | no | — | no | no | shapes, not names. What the unit is belongs to the source capability and to the catalogue |
| `item_ref` | uuid | no | no | — | no | no | resolved through the orderable_item port, for outcomes that correspond to a catalogued thing |
| `description_at_time` | string | yes | no | — | no | no | frozen. What an invoice line says must not change when a catalogue item is renamed |
| `evidence_refs` | json | no | no | — | no | no | flat list of references supporting the outcome - completion evidence, attendance evidence, sign-off. This is what a dispute is settled with and the outcome is materially weaker without it |
| `evidence_strength` | string | no | no | — | no | no | passed through verbatim from the source capability where it declares one, so that a disputed line can be answered with what was actually recorded rather than with an assertion |
| `classification_hint` | string | no | no | — | no | no | the source's own view of whether this is chargeable - for example a backfill classification. A hint, never a decision |
| `rated_amount_minor` | money_minor | no | no | — | no | yes |  |
| `rate_rule_ref` | uuid | no | no | — | no | yes | which rule produced the amount, captured at rating time |
| `tax_classification` | string | no | no | — | no | yes |  |
| `invoice_line_id` | uuid | no | no | — | no | no |  |
| `excluded_reason` | text | no | no | — | no | no |  |

## 2. Lifecycle

States: `received`, `rated`, `unratable`, `invoiced`, `excluded`, `credited`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `received` | GAP | GAP | GAP | entity-specific, see capability model |
| `rated` | GAP | GAP | GAP | entity-specific, see capability model |
| `unratable` | GAP | GAP | GAP | entity-specific, see capability model |
| `invoiced` | GAP | GAP | GAP | entity-specific, see capability model |
| `excluded` | GAP | GAP | GAP | entity-specific, see capability model |
| `credited` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. unique(tenant_id, source_capability_key, source_ref). A source record produces at most one outcome. This is the constraint that stops at-least-once event delivery becoming double billing, and it is the single most important constraint in the capability.
2. quantity is positive. A credit is a separate record with its own authority, never a negative outcome.
3. description_at_time and evidence references are frozen at receipt. An invoice line whose description changes after issue is a document that no longer matches the copy the counterparty holds.
4. An outcome may belong to at most one invoice line. Splitting an outcome across invoices requires splitting the outcome first, explicitly.
5. Financial fields are gated by view_financial. quantity, description and evidence are not, because an operations manager defending a disputed line needs all three and frequently has no financial access.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `tenant_scoped_with_site_partition`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/billing/billable_outcome.md`
- Screen specifications: `11-UX/screens/billing/billable_outcome/`
- Test catalogue: `20-TESTING/billing/billable_outcome/`
