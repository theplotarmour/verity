---
doc_id: ENT-SCHEDULE_VERSION
title: Entity — Schedule Version
generated: true
source_model: _model/capabilities/scheduling_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Schedule Version

*This document is generated. Edit `_model/capabilities/scheduling_dispatch.yaml`, not this file.*

**Capability/module:** `scheduling_dispatch` · **Owner scope:** `tenant`

A published snapshot of a period's assignments for a location or a resource set - what people were told, as they were told it.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `scope_location_ref` | uuid | no | no | — | no | no | resolved through the org_structure port |
| `period_start` | timestamptz | yes | no | — | no | no |  |
| `period_end` | timestamptz | yes | no | — | no | no |  |
| `version_number` | int | yes | no | — | no | no |  |
| `published_at` | timestamptz | no | no | — | no | no |  |
| `published_by_principal_id` | uuid | no | no | — | no | no |  |
| `assignment_ids` | json | yes | no | — | no | no | flat list of scalars capturing exactly which assignments were in this version |
| `change_summary` | json | no | no | — | no | no | against the previous version - added, removed, moved - as flat scalar lists, so a resource can be shown what changed rather than a new roster |
| `coverage_shortfall_count` | int | yes | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `published`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `published` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A published version is immutable. A change produces a new version. Editing a published roster in place means nobody can prove what somebody was told.
2. version_number is contiguous per scope and period. A gap means a version was published and lost.
3. A version may not be published while the period contains any assignment in state planned that the publisher has not either included or explicitly excluded. A silently omitted assignment is a person who was left off the roster.

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

- Permission matrix: `14-PERMISSIONS/scheduling_dispatch/schedule_version.md`
- Screen specifications: `11-UX/screens/scheduling_dispatch/schedule_version/`
- Test catalogue: `20-TESTING/scheduling_dispatch/schedule_version/`
