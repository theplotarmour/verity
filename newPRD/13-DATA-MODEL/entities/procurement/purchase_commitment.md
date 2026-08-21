---
doc_id: ENT-PURCHASE_COMMITMENT
title: Entity — Purchase Commitment
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Purchase Commitment

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

**Capability/module:** `procurement` · **Owner scope:** `tenant`

The order placed with a supplier - what was asked for, at what price, for when, and everything received and invoiced against it.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `reference` | string | yes | yes | tenant | no | no | the number the supplier quotes back |
| `supplier_party_ref` | uuid | yes | no | — | no | no | resolved through the party_directory port |
| `request_id` | uuid | no | no | — | no | no |  |
| `deliver_to_location_ref` | uuid | no | no | — | no | no |  |
| `deliver_to_stock_location_ref` | uuid | no | no | — | no | no | resolved through the stock_movement_sink port, so a receipt lands somewhere specific rather than at a site |
| `expected_at` | date | no | no | — | no | no |  |
| `lines` | json | yes | no | — | no | no | flat ordered list of scalars per line - item_ref or description, quantity_ordered, unit_of_measure, unit_price_minor, tax_classification, quantity_received, quantity_invoiced, line_state |
| `currency` | string | yes | no | — | no | yes |  |
| `subtotal_minor` | money_minor | yes | no | — | no | yes |  |
| `tax_total_minor` | money_minor | no | no | — | no | yes | nullable rather than zero, so unknown tax and no tax never render identically |
| `total_minor` | money_minor | yes | no | — | no | yes |  |
| `payment_terms_days` | int | no | no | — | no | yes |  |
| `version_number` | int | yes | no | — | no | no |  |
| `sent_at` | timestamptz | no | no | — | no | no |  |
| `sent_via` | enum | yes | no | — | no | no | telephone and in_person are first-class because a great many commitments in this market are made verbally and recording them as not-sent would make the record wrong |
| `acknowledged_at` | timestamptz | no | no | — | no | no |  |
| `closed_reason` | text | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `pending_approval`, `open`, `partially_received`, `received`, `closed`, `cancelled`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `pending_approval` | GAP | GAP | GAP | entity-specific, see capability model |
| `open` | GAP | GAP | GAP | entity-specific, see capability model |
| `partially_received` | GAP | GAP | GAP | entity-specific, see capability model |
| `received` | GAP | GAP | GAP | entity-specific, see capability model |
| `closed` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. lines may not be empty and every quantity_ordered is positive.
2. No field on a sent commitment may be edited. An amendment increments version_number and produces a new document, because the supplier is holding a copy of what was sent.
3. quantity_received may exceed quantity_ordered only where over-receipt tolerance permits it; the excess is always visible as an over-receipt rather than absorbed by silently raising the ordered quantity.
4. Financial fields are gated by view_financial. Quantities and descriptions are not, because the person receiving goods must be able to see what was expected.
5. A commitment may not be raised against a supplier whose party relationship is suspended or ended. This is checked at raise time and again at send time, because the two can be days apart.

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

- Permission matrix: `14-PERMISSIONS/procurement/purchase_commitment.md`
- Screen specifications: `11-UX/screens/procurement/purchase_commitment/`
- Test catalogue: `20-TESTING/procurement/purchase_commitment/`
