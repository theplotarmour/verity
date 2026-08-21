---
doc_id: ENT-SLA_MEASUREMENT
title: Entity — SLA Measurement
generated: true
source_model: _model/capabilities/sla_contract.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — SLA Measurement

*This document is generated. Edit `_model/capabilities/sla_contract.yaml`, not this file.*

**Capability/module:** `sla_contract` · **Owner scope:** `tenant`

One clock against one record against one service level - when it started, what paused it, when it stopped, and whether it breached.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `service_level_id` | uuid | yes | no | — | no | no |  |
| `service_level_version` | int | yes | no | — | no | no | frozen at start. A later version never re-measures a running or completed clock |
| `subject_ref` | uuid | yes | no | — | no | no | the record being measured, resolved through the measurable_event port. Opaque here |
| `subject_capability_key` | string | yes | no | — | no | no |  |
| `location_ref` | uuid | no | no | — | no | no |  |
| `calendar_ref_used` | uuid | no | no | — | no | no | which calendar was actually resolved, recorded because the fallback chain has three steps and a dispute about elapsed business hours always begins with which calendar was used |
| `started_at` | timestamptz | yes | no | — | no | no |  |
| `target_at` | timestamptz | no | no | — | no | no | the deadline, computed at start against the calendar and then FROZEN. Recomputing it as the calendar changes would move a deadline that a person has already been told |
| `stopped_at` | timestamptz | no | no | — | no | no |  |
| `total_paused_minutes` | int | yes | no | — | no | no |  |
| `elapsed_measured` | decimal | no | no | — | no | no | elapsed in the level's target_unit, excluding paused time and non-operating time |
| `outcome` | enum | yes | no | — | no | no | breached_and_continuing exists because a breached clock keeps running - the work is still owed and the eventual elapsed time matters for the size of the consequence |
| `breach_at` | timestamptz | no | no | — | no | no |  |
| `breach_margin` | decimal | no | no | — | no | no | by how much, in target_unit. Signed, so a met measurement records how close it came - which is what tells an operations manager a target is about to become chronic |
| `excluded` | bool | yes | no | — | no | no |  |
| `exclusion_reason` | text | no | no | — | no | no |  |
| `excluded_by_principal_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `running`, `paused`, `stopped`, `excluded`, `disputed`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `running` | GAP | GAP | GAP | entity-specific, see capability model |
| `paused` | GAP | GAP | GAP | entity-specific, see capability model |
| `stopped` | GAP | GAP | GAP | entity-specific, see capability model |
| `excluded` | GAP | GAP | GAP | entity-specific, see capability model |
| `disputed` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. target_at is computed once at start and frozen. A deadline that moves after somebody has been told it is not a deadline.
2. service_level_version is frozen at start.
3. A measurement may only be paused for a reason in its level's pausable_reason_keys. A pause with any other reason is rejected, which is the mechanism that makes the contract the authority.
4. total_paused_minutes may never exceed the level's max_pause_minutes where one is set. Beyond the ceiling the clock resumes regardless of the pause state.
5. excluded=true requires exclusion_reason and excluded_by_principal_id. An unexplained exclusion is the single easiest way to make a performance report say whatever is wanted.
6. A measurement is append-only after it stops. Corrections are exclusions or disputes, never edits, because the measurement is the evidence in a penalty calculation.

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

- Permission matrix: `14-PERMISSIONS/sla_contract/sla_measurement.md`
- Screen specifications: `11-UX/screens/sla_contract/sla_measurement/`
- Test catalogue: `20-TESTING/sla_contract/sla_measurement/`
