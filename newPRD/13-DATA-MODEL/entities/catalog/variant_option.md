---
doc_id: ENT-VARIANT_OPTION
title: Entity — Variant and Modifier Option
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Variant and Modifier Option

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

**Capability/module:** `catalog` · **Owner scope:** `tenant`

A choice a buyer makes about an item that changes its price, its composition or its availability - and usually all three at once.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `item_id` | uuid | yes | no | — | no | no |  |
| `group_key` | string | yes | no | — | no | no | options in one group are mutually exclusive or jointly selectable per the group rule below |
| `group_label` | string | yes | no | — | no | no |  |
| `option_key` | string | yes | no | — | no | no |  |
| `option_label` | string | yes | no | — | no | no |  |
| `selection_rule` | enum | yes | no | — | no | no | the rule applies to the GROUP and is denormalised onto each option so that a client can validate without a second fetch |
| `selection_n` | int | no | no | — | no | no | required when selection_rule is exactly_n |
| `price_delta_minor` | money_minor | yes | no | — | no | yes |  |
| `price_delta_is_percent` | bool | yes | no | — | no | yes |  |
| `composition_delta_id` | uuid | no | no | — | no | no | what this option adds to or removes from the item's composition, which is how a modifier affects both cost and stock |
| `duration_delta_minutes` | int | yes | no | — | no | no | how the option changes the time the item takes, which matters to every downstream schedule |
| `is_default` | bool | yes | no | — | no | no |  |
| `sort_weight` | int | yes | no | — | no | no |  |
| `availability_schedule_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `unavailable`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `unavailable` | GAP | GAP | GAP | entity-specific, see capability model |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. selection_rule=exactly_n requires selection_n greater than one.
2. At most one option per group may be is_default where the group rule is exactly_one or at_most_one. Two defaults in an exclusive group is a selection nobody can resolve.
3. An option whose availability_schedule makes it unavailable may not be a default. A default that cannot be selected produces an order that fails validation the moment it is opened.
4. price_delta and duration_delta apply additively across selected options within one item. Multiplicative or ordered composition is deliberately not supported, because the result depends on evaluation order and no order is obviously correct.
5. Financial fields are gated by view_financial.

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

- Permission matrix: `14-PERMISSIONS/catalog/variant_option.md`
- Screen specifications: `11-UX/screens/catalog/variant_option/`
- Test catalogue: `20-TESTING/catalog/variant_option/`
