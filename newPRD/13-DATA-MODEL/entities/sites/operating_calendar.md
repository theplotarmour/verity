---
doc_id: ENT-OPERATING_CALENDAR
title: Entity — Operating Calendar
generated: true
source_model: _model/capabilities/sites.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Operating Calendar

*This document is generated. Edit `_model/capabilities/sites.yaml`, not this file.*

**Capability/module:** `sites` · **Owner scope:** `tenant`

When a location is open, when it is not, and the exceptions - because a national holiday list is always wrong for somebody.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `name` | string | yes | no | — | no | no |  |
| `weekly_pattern` | json | yes | no | — | no | no | seven entries of open and close time, or a closed marker. A list of scalars per day rather than a nested object, so it stays diffable and so precedence has nothing to merge |
| `continuous_operation` | bool | yes | no | — | no | no | true where the location never closes, which makes the weekly pattern advisory and makes any day-boundary calculation elsewhere a bug unless it consults this flag |
| `day_boundary_time` | time | yes | no | — | no | no | when the operating day rolls over. For a continuously operating location this is almost never midnight, and assuming midnight misattributes every overnight period to the wrong day - which shows up as an attendance dispute and a billing dispute simultaneously |
| `timezone` | string | yes | no | — | no | no |  |
| `inherits_from_calendar_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `active`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A calendar may inherit from at most one parent and inheritance depth is bounded at calendar_inheritance_max_depth. Unbounded inheritance makes resolving today's hours a recursive query on a hot path.
2. day_boundary_time is mandatory and has no safe default other than midnight, which is stated as a default rather than assumed silently.
3. Changing a calendar never retroactively changes what already happened. Historical records carry the resolved hours at the time, because an attendance record re-evaluated against a calendar edited six months later is evidence somebody rewrote.

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

- Permission matrix: `14-PERMISSIONS/sites/operating_calendar.md`
- Screen specifications: `11-UX/screens/sites/operating_calendar/`
- Test catalogue: `20-TESTING/sites/operating_calendar/`
