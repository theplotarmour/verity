---
doc_id: ENT-AVAILABILITY_SCHEDULE
title: Entity — Availability Schedule
generated: true
source_model: _model/capabilities/catalog.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Availability Schedule

*This document is generated. Edit `_model/capabilities/catalog.yaml`, not this file.*

**Capability/module:** `catalog` · **Owner scope:** `tenant`

When and where an item or an option may be selected, expressed as periods rather than as a flag.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `weekly_windows` | json | no | no | — | no | no | flat list of scalars - weekday, start time, end time. Null means always, which is stated explicitly rather than implied by an empty list |
| `date_from` | date | no | no | — | no | no |  |
| `date_to` | date | no | no | — | no | no |  |
| `location_refs` | json | no | no | — | no | no | flat list of location references, resolved through the org_structure port. Null means every location |
| `channel_refs` | json | no | no | — | no | no | flat list of channel keys. Null means every channel |
| `timezone` | string | yes | no | — | no | no | the schedule's own timezone. A window authored in one timezone and applied in another is off by an hour twice a year, and it is always discovered by somebody being told an item is unavailable when it plainly is not |

## 2. Lifecycle

States: `active`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. date_to, where set, is on or after date_from.
2. A schedule with null weekly_windows, null dates, null locations and null channels is a schedule that means always, and is refused at save time in favour of simply not attaching a schedule. An always-schedule is a layer of indirection that hides nothing.
3. Schedules attached to both an item and its option compose by intersection. The item's schedule always constrains; an option can never widen its parent's availability.

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

- Permission matrix: `14-PERMISSIONS/catalog/availability_schedule.md`
- Screen specifications: `11-UX/screens/catalog/availability_schedule/`
- Test catalogue: `20-TESTING/catalog/availability_schedule/`
