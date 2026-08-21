---
doc_id: ENT-STOCK_MOVEMENT
title: Entity — Stock Movement
generated: true
source_model: _model/capabilities/inventory.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Stock Movement

*This document is generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

**Capability/module:** `inventory` · **Owner scope:** `tenant`

One append-only record that a quantity of something moved, was created, or was destroyed - with its reason, its actor and its evidence. The only way a balance ever changes.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no | uuid v7, so the ledger is time-ordered without a separate sequence |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `item_ref` | uuid | yes | yes | — | no | no | resolved through the orderable_item port. Opaque here |
| `from_location_id` | uuid | no | yes | — | no | no | null for a receipt, which creates stock from outside the system |
| `to_location_id` | uuid | no | yes | — | no | no | null for a consumption or a scrap, which destroys it |
| `quantity` | decimal | yes | yes | — | no | no |  |
| `unit_of_measure` | string | yes | yes | — | no | no | recorded on the movement rather than inherited from the item, because an item's unit can be changed by a later catalogue version and a historical movement must remain interpretable |
| `movement_kind` | enum | yes | yes | — | no | no |  |
| `reason_key` | string | yes | yes | — | no | no | from a tenant-configured closed list per movement kind. Mandatory on every movement including adjustments, because an unreasoned adjustment is the field where inconvenient truth is hidden |
| `reason_note` | text | no | yes | — | no | no |  |
| `source_capability_key` | string | no | yes | — | no | no |  |
| `source_ref` | uuid | no | yes | — | no | no | the work order line, order line or receipt that caused it, resolved through the relevant port. Opaque |
| `unit_cost_minor` | money_minor | no | yes | — | no | yes | the cost applied to this movement by the valuation method at the time. Frozen, because recomputing history is how two valuations of the same past appear |
| `batch_ref` | string | no | yes | — | no | no |  |
| `expires_on` | date | no | yes | — | no | no |  |
| `occurred_at` | timestamptz | yes | yes | — | no | no | business time, which for an offline replay is when the person did it |
| `recorded_at` | timestamptz | yes | yes | — | no | no |  |
| `actor_principal_id` | uuid | yes | yes | — | no | no |  |
| `evidence_ref` | string | no | yes | — | no | no |  |
| `reverses_movement_id` | uuid | no | yes | — | no | no |  |
| `count_id` | uuid | no | yes | — | no | no |  |

## 2. Lifecycle

States: `recorded`, `reversed`, `superseded_by_count`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `recorded` | GAP | GAP | GAP | entity-specific, see capability model |
| `reversed` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded_by_count` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Every field is immutable. There is no update path and no delete path. A wrong movement is corrected by a reversing movement, so that the sequence of corrections is itself visible.
2. At least one of from_location_id and to_location_id is non-null. A movement from nowhere to nowhere is not a movement.
3. quantity is positive. Direction is expressed by the from and to locations, never by a sign, because a signed quantity plus a direction is two ways to say the same thing and they will eventually disagree.
4. reason_key is mandatory for every kind including transfer. A transfer with no reason cannot be distinguished from a correction dressed as a transfer.
5. unit_cost_minor is frozen at write. Recomputing the cost of a historical movement produces two valuations of the same past.
6. Financial fields are gated by view_financial and are never offline_editable. Quantity is neither, because the person recording consumption in a store room must be able to record it.

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

- Permission matrix: `14-PERMISSIONS/inventory/stock_movement.md`
- Screen specifications: `11-UX/screens/inventory/stock_movement/`
- Test catalogue: `20-TESTING/inventory/stock_movement/`
