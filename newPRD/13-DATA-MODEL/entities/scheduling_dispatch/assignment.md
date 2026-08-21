---
doc_id: ENT-ASSIGNMENT
title: Entity — Assignment
generated: true
source_model: _model/capabilities/scheduling_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Assignment

*This document is generated. Edit `_model/capabilities/scheduling_dispatch.yaml`, not this file.*

**Capability/module:** `scheduling_dispatch` · **Owner scope:** `tenant`

A commitment that one resource will satisfy one demand for a period. The unit that a person actually experiences.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `demand_id` | uuid | yes | no | — | no | no |  |
| `resource_ref` | uuid | yes | no | — | no | no | resolved through the schedulable_resource port |
| `starts_at` | timestamptz | yes | no | — | no | no |  |
| `ends_at` | timestamptz | yes | no | — | no | no |  |
| `assigned_by` | enum | yes | no | — | no | no |  |
| `assigned_by_principal_id` | uuid | no | no | — | no | no |  |
| `assignment_reason` | text | no | no | — | no | no | mandatory when assigned_by is optimiser - the explanation of why this resource. An unexplained optimiser assignment gets overridden until the optimiser is switched off |
| `acceptance_required` | bool | yes | no | — | no | no | whether the resource must confirm. Configuration, because engagement kinds differ in whether a person may decline |
| `accepted_at` | timestamptz | no | no | — | no | no |  |
| `declined_at` | timestamptz | no | no | — | no | no |  |
| `decline_reason` | text | no | no | — | no | no |  |
| `published_at` | timestamptz | no | no | — | no | no | when the resource could first see it. Null means the assignment exists only in the plan |
| `overtime_minutes` | int | no | no | — | no | no | computed against the resource's limits at assignment time and recomputed on change |
| `cost_estimate_minor` | money_minor | no | no | — | no | yes |  |
| `swap_of_assignment_id` | uuid | no | no | — | no | no |  |
| `version` | int | yes | no | — | no | no | incremented on every change after publication, so a resource can see that what they were told has changed |

## 2. Lifecycle

States: `planned`, `published`, `accepted`, `declined`, `in_progress`, `completed`, `released`, `no_show`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `planned` | GAP | GAP | GAP | entity-specific, see capability model |
| `published` | GAP | GAP | GAP | entity-specific, see capability model |
| `accepted` | GAP | GAP | GAP | entity-specific, see capability model |
| `declined` | GAP | GAP | GAP | entity-specific, see capability model |
| `in_progress` | GAP | GAP | GAP | entity-specific, see capability model |
| `completed` | GAP | GAP | GAP | entity-specific, see capability model |
| `released` | GAP | GAP | GAP | entity-specific, see capability model |
| `no_show` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. ends_at > starts_at.
2. No two non-terminal assignments for one resource_ref may overlap in time. Double-booking a person is the defect that destroys trust in a roster faster than any other, and it is prevented by a constraint rather than by a check.
3. An assignment may not be created against a resource the schedulable_resource port reports as unavailable, except through the escalation path, which requires a reason and is separately reported.
4. published_at may never be unset. Un-publishing an assignment somebody has already seen does not un-tell them.
5. Financial fields are gated by view_financial and are never offline_editable.

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

- Permission matrix: `14-PERMISSIONS/scheduling_dispatch/assignment.md`
- Screen specifications: `11-UX/screens/scheduling_dispatch/assignment/`
- Test catalogue: `20-TESTING/scheduling_dispatch/assignment/`
