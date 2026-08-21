---
doc_id: ENT-SERVICE_LEVEL
title: Entity — Service Level
generated: true
source_model: _model/capabilities/sla_contract.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Service Level

*This document is generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

**Capability/module:** `sla_contract` · **Owner scope:** `tenant`

One measurable obligation - what is measured, from what event to what event, against which calendar, to what target, with what consequence.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `contract_id` | uuid | yes | no | — | no | no |  |
| `key` | string | yes | no | — | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `measure_kind` | enum | yes | no | — | no | no | a closed set of shapes. What is being responded to or resolved is never named here - the subject arrives through the measurable_event port |
| `start_event_key` | string | yes | no | — | no | no | the event that starts the clock, matched against the event catalogue |
| `stop_event_key` | string | no | no | — | no | no | null for measures that are fractions over a period rather than durations |
| `target_value` | decimal | yes | no | — | no | no |  |
| `target_unit` | enum | yes | no | — | no | no | business_hours and hours are deliberately distinct. Conflating them understates every breach and the difference is frequently a factor of three |
| `calendar_ref` | uuid | no | no | — | no | no | which calendar business_hours resolve against; falls back to the contract calendar and then to the location calendar, and which one was used is recorded on each measurement |
| `applies_when_expression` | text | no | no | — | no | no | an Expression narrowing which records this level measures - by priority, by location, by category. Statically cost-bounded |
| `pausable_reason_keys` | json | yes | no | — | no | no | the ONLY reasons that may pause this clock. Empty means the clock never pauses. This is the field that makes the contract the authority on pausing rather than the operational capability |
| `max_pause_minutes` | int | no | no | — | no | no | a ceiling on total paused time per measurement, because an unbounded pause makes any target meetable |
| `measurement_period` | enum | yes | no | — | no | no |  |
| `aggregation` | enum | yes | no | — | no | no | how per-record outcomes roll up. A 95th-percentile target and an every-record target are different obligations and are frequently written ambiguously in the underlying agreement |
| `percentile` | decimal | no | no | — | no | no | required when aggregation is percentile |
| `grace_value` | decimal | no | no | — | no | no | a tolerance before breach, expressed in target_unit |
| `version_number` | int | yes | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. aggregation=percentile requires percentile to be set and between 0 and 100 exclusive.
2. measure_kind values that are durations require stop_event_key. Fraction and count measures require it to be null.
3. pausable_reason_keys may be empty and may never be null. An empty list is the explicit statement that this clock does not pause, which is a materially different contract from one where nobody configured the field.
4. A service level is never edited after its contract activates. A change is a new version, and every measurement records the version it resolved against.
5. target_unit=business_hours requires a resolvable calendar at measurement time. A business-hours target with no calendar is measured in wall hours, which silently makes it three times harder to breach and is therefore refused rather than degraded.

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

- Permission matrix: `14-PERMISSIONS/sla_contract/service_level.md`
- Screen specifications: `11-UX/screens/sla_contract/service_level/`
- Test catalogue: `20-TESTING/sla_contract/service_level/`
