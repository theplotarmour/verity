---
doc_id: ENT-INVOICE_LINE
title: Entity — Invoice Line
generated: true
source_model: _model/capabilities/billing.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Invoice Line

*This document is generated. Edit `_model/capabilities/billing.yaml`, not this file.*

**Capability/module:** `billing` · **Owner scope:** `tenant`

One chargeable item on an invoice, frozen at issue, disputable independently of the rest.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `invoice_id` | uuid | yes | no | — | no | no |  |
| `line_number` | int | yes | no | — | no | no |  |
| `description` | string | yes | yes | — | no | no |  |
| `quantity` | decimal | yes | yes | — | no | no |  |
| `unit_of_measure` | string | yes | yes | — | no | no |  |
| `unit_amount_minor` | money_minor | yes | yes | — | no | yes |  |
| `line_total_minor` | money_minor | yes | yes | — | no | yes |  |
| `tax_classification` | string | no | yes | — | no | yes |  |
| `tax_amount_minor` | money_minor | no | yes | — | no | yes |  |
| `rate_rule_ref` | uuid | no | yes | — | no | yes |  |
| `evidence_refs` | json | no | yes | — | no | no | carried from the outcomes, so a disputed line can be answered with the evidence rather than with an assertion |
| `outcome_count` | int | yes | no | — | no | no | how many billable outcomes this line aggregates, so a summarised line can always be expanded |
| `disputed` | bool | yes | no | — | no | no |  |
| `dispute_reason` | text | no | no | — | no | no |  |
| `credited_by_line_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `issued`, `disputed`, `credited`, `settled`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `issued` | GAP | GAP | GAP | entity-specific, see capability model |
| `disputed` | GAP | GAP | GAP | entity-specific, see capability model |
| `credited` | GAP | GAP | GAP | entity-specific, see capability model |
| `settled` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Every field except the dispute and credit fields is immutable after issue. An invoice line that changes is a document that no longer matches the copy the counterparty holds.
2. line_total_minor equals quantity multiplied by unit_amount_minor, rounded by the declared rounding rule, and the rounding rule used is recorded on the invoice rather than assumed.
3. A summarised line always retains the ability to expand to its constituent outcomes with their evidence. A line a counterparty cannot drill into is a line they will dispute in full.
4. disputed=true requires dispute_reason.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `tenant_scoped`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/billing/invoice_line.md`
- Screen specifications: `11-UX/screens/billing/invoice_line/`
- Test catalogue: `20-TESTING/billing/invoice_line/`
