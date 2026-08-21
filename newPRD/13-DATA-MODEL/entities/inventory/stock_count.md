---
doc_id: ENT-STOCK_COUNT
title: Entity — Stock Count
generated: true
source_model: _model/capabilities/inventory.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Stock Count

*This document is generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

**Capability/module:** `inventory` · **Owner scope:** `tenant`

A structured comparison of what the system believes against what somebody physically found, with a second person deciding where they differ.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `location_id` | uuid | yes | no | — | no | no |  |
| `count_kind` | enum | yes | no | — | no | no |  |
| `scope_item_refs` | json | no | no | — | no | no | flat list. Null means every item with a non-zero balance or any movement in the period, which is a materially different scope from every item that exists and is stated rather than assumed |
| `snapshot_at` | timestamptz | yes | yes | — | no | no | the instant the expected balances were frozen. Everything after it is compared as movement-since rather than as discrepancy, which is the difference between counting and blaming |
| `expected_lines` | json | yes | no | — | no | no | flat list of item and expected quantity at snapshot. Frozen, because a count compared against a live balance can never be reconciled |
| `counted_by_principal_id` | uuid | no | no | — | no | no |  |
| `counted_at` | timestamptz | no | no | — | no | no |  |
| `reviewed_by_principal_id` | uuid | no | no | — | no | no |  |
| `blind` | bool | yes | no | — | no | no | whether the counter sees the expected quantity. Default blind, because a visible expectation is the number that gets written down |
| `variance_value_minor` | money_minor | no | no | — | no | yes |  |
| `variance_line_count` | int | no | no | — | no | no |  |
| `approved_at` | timestamptz | no | no | — | no | no |  |

## 2. Lifecycle

States: `planned`, `in_progress`, `counted`, `under_review`, `applied`, `abandoned`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `planned` | GAP | GAP | GAP | entity-specific, see capability model |
| `in_progress` | GAP | GAP | GAP | entity-specific, see capability model |
| `counted` | GAP | GAP | GAP | entity-specific, see capability model |
| `under_review` | GAP | GAP | GAP | entity-specific, see capability model |
| `applied` | GAP | GAP | GAP | entity-specific, see capability model |
| `abandoned` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. expected_lines is frozen at snapshot_at. A count compared against a balance that moved during counting cannot be reconciled, and every variance becomes an argument.
2. The reviewing principal may not be the counting principal where the tenant requires review. A person confirming their own count is a count with one opinion in it.
3. Applying a count writes count_correction movements with reasons. It never edits a balance, because a balance is derived.
4. A count may not be applied twice. The applied state is terminal.

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

- Permission matrix: `14-PERMISSIONS/inventory/stock_count.md`
- Screen specifications: `11-UX/screens/inventory/stock_count/`
- Test catalogue: `20-TESTING/inventory/stock_count/`
