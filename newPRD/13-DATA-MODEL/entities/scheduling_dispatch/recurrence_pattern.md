---
doc_id: ENT-RECURRENCE_PATTERN
title: Entity — Recurrence Pattern
generated: true
source_model: _model/capabilities/scheduling_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Recurrence Pattern

*This document is generated. Edit `_model/capabilities/scheduling_dispatch.yaml`, not this file.*

**Capability/module:** `scheduling_dispatch` · **Owner scope:** `tenant`

The rule that generates repeating demand, and the horizon over which it has been materialised.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `source_capability_key` | string | yes | no | — | no | no |  |
| `source_ref` | uuid | yes | no | — | no | no | resolved through the schedulable_demand port |
| `rule` | text | yes | no | — | no | no | an expression in the closed expression language, statically cost-bounded, so a pattern cannot be authored that generates unbounded demand |
| `timezone` | string | yes | no | — | no | no | the pattern's own timezone, which may differ from the location's. A weekly pattern authored in one timezone and applied in another drifts by an hour twice a year and the drift is always discovered by a person standing somewhere at the wrong time |
| `starts_on` | date | yes | no | — | no | no |  |
| `ends_on` | date | no | no | — | no | no |  |
| `materialised_to` | date | no | no | — | no | no | how far ahead demand has actually been generated. The gap between this and the horizon is the thing that silently stops a roster existing |
| `horizon_days` | int | yes | no | — | no | no |  |
| `exception_dates` | json | no | no | — | no | no | flat list of dates where the pattern does not apply |

## 2. Lifecycle

States: `active`, `paused`, `ended`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `paused` | GAP | GAP | GAP | entity-specific, see capability model |
| `ended` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. The rule expression is statically cost-bounded and is rejected at save time if it could generate more than max_generated_demand_per_run occurrences. An unbounded pattern is a denial of service against the tenant's own database.
2. materialised_to may never exceed starts_on plus horizon_days plus the generation batch size. Materialising the whole of a pattern with no end date is how a scheduling table becomes unbounded.
3. Changing a pattern never alters demand that has already been materialised and covered. It applies from the change forward, and already-materialised uncovered demand is listed for explicit review.

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

- Permission matrix: `14-PERMISSIONS/scheduling_dispatch/recurrence_pattern.md`
- Screen specifications: `11-UX/screens/scheduling_dispatch/recurrence_pattern/`
- Test catalogue: `20-TESTING/scheduling_dispatch/recurrence_pattern/`
