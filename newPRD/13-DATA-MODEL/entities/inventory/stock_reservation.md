---
doc_id: ENT-STOCK_RESERVATION
title: Entity — Stock Reservation
generated: true
source_model: _model/capabilities/inventory.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Stock Reservation

*This document is generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

**Capability/module:** `inventory` · **Owner scope:** `tenant`

A claim on future stock that has not yet moved. Held separately from movements so that available and on-hand never mean the same thing by accident.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `item_ref` | uuid | yes | no | — | no | no |  |
| `location_id` | uuid | yes | no | — | no | no |  |
| `quantity` | decimal | yes | no | — | no | no |  |
| `unit_of_measure` | string | yes | no | — | no | no |  |
| `source_capability_key` | string | yes | no | — | no | no |  |
| `source_ref` | uuid | yes | no | — | no | no | what claimed it, resolved through the relevant port |
| `reserved_at` | timestamptz | yes | yes | — | no | no |  |
| `expires_at` | timestamptz | no | no | — | no | no | a reservation with no expiry is a permanent reduction in available stock that nobody remembers making. Nullable because a genuinely open-ended reservation exists, and it is monitored rather than forbidden |
| `consumed_movement_id` | uuid | no | no | — | no | no |  |
| `released_reason` | text | no | no | — | no | no |  |

## 2. Lifecycle

States: `held`, `partially_consumed`, `consumed`, `released`, `expired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `held` | GAP | GAP | GAP | entity-specific, see capability model |
| `partially_consumed` | GAP | GAP | GAP | entity-specific, see capability model |
| `consumed` | GAP | GAP | GAP | entity-specific, see capability model |
| `released` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. quantity is positive.
2. A reservation is never itself a movement and never alters the on-hand balance. It reduces available and leaves on-hand untouched, and the two figures are always reported separately.
3. Consuming a reservation writes a movement and links it, in the same transaction, so a reservation can never be consumed without stock moving or stock move against a reservation without discharging it.
4. Reservations may exceed on-hand where the location allows negative. Refusing to reserve because stock has not arrived yet would make forward commitment impossible.

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

- Permission matrix: `14-PERMISSIONS/inventory/stock_reservation.md`
- Screen specifications: `11-UX/screens/inventory/stock_reservation/`
- Test catalogue: `20-TESTING/inventory/stock_reservation/`
