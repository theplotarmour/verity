---
doc_id: ENT-MAINTENANCE_PLAN
title: Entity — Maintenance Plan
generated: true
source_model: _model/capabilities/assets.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Maintenance Plan

*This document is generated. Edit `_model/capabilities/assets.yaml`, not this file.*

**Capability/module:** `assets` · **Owner scope:** `tenant`

A rule that generates work against an asset on a schedule, on usage, or on a condition - and never performs any of it.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `applies_to_class_id` | uuid | no | no | — | no | no |  |
| `applies_to_asset_ids` | json | no | no | — | no | no | flat list, for a plan attached to specific assets rather than to a class |
| `trigger_kind` | enum | yes | no | — | no | no |  |
| `interval_days` | int | no | no | — | no | no |  |
| `meter_key` | string | no | no | — | no | no |  |
| `meter_interval` | decimal | no | no | — | no | no |  |
| `condition_trigger` | enum | yes | no | — | no | no |  |
| `lead_days` | int | yes | no | — | no | no | how far ahead demand is generated, so the work can be scheduled rather than becoming urgent the day it is due |
| `tolerance_days` | int | yes | no | — | no | no | how late is still compliant. Explicit, because a plan with no tolerance reports every job done a day late as a breach and the report becomes noise |
| `work_type_ref` | uuid | no | no | — | no | no | what kind of work to raise, resolved through the work_generation port |
| `last_generated_at` | timestamptz | no | no | — | no | no |  |
| `next_due_at` | timestamptz | no | no | — | no | no |  |
| `next_due_meter_value` | decimal | no | no | — | no | no |  |
| `suppress_when_out_of_service` | bool | yes | no | — | no | no | whether to keep generating demand for something already under repair. Default true, because raising a service job for a broken thing wastes a visit |

## 2. Lifecycle

States: `draft`, `active`, `suspended`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `suspended` | GAP | GAP | GAP | entity-specific, see capability model |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. trigger_kind=elapsed_time requires interval_days. trigger_kind=meter_usage requires meter_key and meter_interval. trigger_kind=condition_threshold requires condition_trigger other than none.
2. A plan with both a class and an explicit asset list applies to the union, and the overlap generates one demand rather than two. Two plans generating two identical work orders for one due date is the classic duplicate in maintenance systems.
3. A plan never creates work directly. It emits demand through the work_generation port, so that rescheduling, cancelling and completing all belong to the capability that owns work.
4. Changing a plan never withdraws demand already generated. Existing work is listed for review, because a technician may already be on the way.

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

- Permission matrix: `14-PERMISSIONS/assets/maintenance_plan.md`
- Screen specifications: `11-UX/screens/assets/maintenance_plan/`
- Test catalogue: `20-TESTING/assets/maintenance_plan/`
