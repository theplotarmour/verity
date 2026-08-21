---
doc_id: ENT-ORDER_LINE
title: Entity — Order Line
generated: true
source_model: _model/capabilities/order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Order Line

*This document is generated. Edit `_model/capabilities/order.yaml`, not this file.*

**Capability/module:** `order` · **Owner scope:** `tenant`

One requested item on an order, with the options chosen, the price captured at the time and its own fulfilment position.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `order_id` | uuid | yes | no | — | no | no |  |
| `line_number` | int | yes | no | — | no | no |  |
| `item_ref` | uuid | yes | no | — | no | no | resolved through the orderable_item port. Opaque here |
| `item_label_at_time` | string | yes | no | — | no | no | the name as it was when ordered, frozen. Resolving the current name would silently rewrite what somebody ordered when an item is renamed |
| `selected_option_refs` | json | no | no | — | no | no | flat list of scalars |
| `option_summary_at_time` | string | no | no | — | no | no | a human-readable frozen rendering of the choices, so a historical line reads correctly without resolving six references |
| `quantity` | decimal | yes | no | — | no | no |  |
| `unit_of_measure` | string | yes | no | — | no | no |  |
| `unit_price_minor` | money_minor | no | no | — | no | yes | nullable because an unpriced line is a legitimate state that must be resolved before confirmation, and zero would be a price |
| `price_rule_ref` | uuid | no | no | — | no | yes | which rule produced the price, captured at the time. This is what makes a price dispute answerable a year later |
| `line_adjustment_minor` | money_minor | yes | no | — | no | yes |  |
| `adjustment_kind` | enum | no | no | — | no | yes | comp and price_override are separate values deliberately. A comp is a decision to give something away; an override is a decision that the price is different. Merging them makes both invisible |
| `adjustment_reason` | text | no | no | — | no | yes |  |
| `adjustment_by_principal_id` | uuid | no | no | — | no | yes |  |
| `tax_classification_at_time` | string | no | no | — | no | yes |  |
| `line_total_minor` | money_minor | no | no | — | no | yes |  |
| `fulfilment_route_ref` | uuid | no | no | — | no | no | where this line was sent, resolved through the fulfilment_route port |
| `fulfilled_quantity` | decimal | yes | no | — | no | no |  |
| `void_reason` | text | no | no | — | no | no |  |
| `notes` | text | no | no | — | no | no | instructions attached to this line, which must reach whoever fulfils it |
| `added_at` | timestamptz | yes | yes | — | no | no |  |
| `added_by_principal_id` | uuid | yes | no | — | no | no |  |

## 2. Lifecycle

States: `captured`, `priced`, `routed`, `in_fulfilment`, `fulfilled`, `voided`, `returned`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `captured` | GAP | GAP | GAP | entity-specific, see capability model |
| `priced` | GAP | GAP | GAP | entity-specific, see capability model |
| `routed` | GAP | GAP | GAP | entity-specific, see capability model |
| `in_fulfilment` | GAP | GAP | GAP | entity-specific, see capability model |
| `fulfilled` | GAP | GAP | GAP | entity-specific, see capability model |
| `voided` | GAP | GAP | GAP | entity-specific, see capability model |
| `returned` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. quantity is positive. A negative line is a return and is a different record, because a return has its own authorisation and its own effect on stock.
2. fulfilled_quantity may never exceed quantity. Over-fulfilment is a separate recorded event and never a silent adjustment of the line.
3. An adjustment of kind comp or price_override requires adjustment_reason and adjustment_by_principal_id. An unattributed price change on a line is the single most common concealment path in a point-of-sale system.
4. item_label_at_time and option_summary_at_time are frozen at capture. Resolving them live would rewrite what somebody ordered.
5. A line may not be modified once its fulfilment route reports it started, except through modify_line, which is a negotiated act with its own authority and its own notification.
6. Financial fields are gated by view_financial. quantity, item label, option summary and notes are not, because whoever fulfils the line needs all four and frequently has no financial access.

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

- Permission matrix: `14-PERMISSIONS/order/order_line.md`
- Screen specifications: `11-UX/screens/order/order_line/`
- Test catalogue: `20-TESTING/order/order_line/`
