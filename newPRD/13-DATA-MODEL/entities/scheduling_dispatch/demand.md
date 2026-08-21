---
doc_id: ENT-DEMAND
title: Entity — Demand
generated: true
source_model: _model/capabilities/scheduling_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Demand

*This document is generated. Edit `_model/capabilities/scheduling_dispatch.yaml`, not this file.*

**Capability/module:** `scheduling_dispatch` · **Owner scope:** `tenant`

A unit of work needing a resource, at a time, at a place, with a required qualification set. Produced by any capability that provides schedulable_demand.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `source_capability_key` | string | yes | yes | — | no | no | which capability produced this demand, so an orphan can be traced |
| `source_ref` | uuid | yes | yes | — | no | no | the producing record, resolved through the schedulable_demand port. Deliberately not a foreign key |
| `location_ref` | uuid | no | no | — | no | no | resolved through the org_structure port |
| `window_start` | timestamptz | yes | no | — | no | no |  |
| `window_end` | timestamptz | yes | no | — | no | no |  |
| `is_window_flexible` | bool | yes | no | — | no | no | whether the window is a hard commitment or a preference. Conflating the two is why an engine reschedules something that could not move |
| `required_qualification_keys` | json | yes | no | — | no | no | flat list of scalars |
| `required_count` | int | yes | no | — | no | no | how many resources this demand needs simultaneously. One field rather than N duplicated demands, so partial coverage is expressible |
| `priority` | enum | yes | no | — | no | no |  |
| `recurrence_id` | uuid | no | no | — | no | no |  |
| `cost_ceiling_minor` | money_minor | no | no | — | no | yes |  |
| `cancellation_deadline_at` | timestamptz | no | no | — | no | no | after which cancelling has a cost, which the billing capability decides and this capability only records |

## 2. Lifecycle

States: `open`, `partially_covered`, `covered`, `at_risk`, `unfulfilled`, `cancelled`, `completed`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `open` | GAP | GAP | GAP | entity-specific, see capability model |
| `partially_covered` | GAP | GAP | GAP | entity-specific, see capability model |
| `covered` | GAP | GAP | GAP | entity-specific, see capability model |
| `at_risk` | GAP | GAP | GAP | entity-specific, see capability model |
| `unfulfilled` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |
| `completed` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. window_end > window_start.
2. required_count >= 1. A demand for zero resources is a demand that should not exist.
3. A demand may never reference the concrete entity of its producing capability. The source_ref is opaque here and is resolved through the port, which is what keeps one engine usable by every producer.
4. Demand is never created directly by a human in this capability. It always arrives from a producer through the schedulable_demand port, so that cancelling the producing record cancels the demand rather than leaving an orphan.

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

- Permission matrix: `14-PERMISSIONS/scheduling_dispatch/demand.md`
- Screen specifications: `11-UX/screens/scheduling_dispatch/demand/`
- Test catalogue: `20-TESTING/scheduling_dispatch/demand/`
