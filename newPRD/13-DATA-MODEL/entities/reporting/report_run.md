---
doc_id: ENT-REPORT_RUN
title: Entity — Report Run
generated: true
source_model: _model/capabilities/reporting.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Report Run

*This document is generated. Edit `_model/capabilities/reporting.yaml`, not this file.*

**Capability/module:** `reporting` · **Owner scope:** `tenant`

One execution of one report for one reader at one moment, with the figures it produced, the definitions it used and how fresh its data was.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `report_id` | uuid | yes | no | — | no | no |  |
| `run_for_principal_id` | uuid | yes | no | — | no | no | whose scope the figures were computed under. Two people running the same report legitimately see different numbers and the run records whose they are |
| `scope_fingerprint` | string | yes | no | — | no | no |  |
| `period_start` | timestamptz | yes | no | — | no | no |  |
| `period_end` | timestamptz | yes | no | — | no | no |  |
| `metric_versions` | json | yes | no | — | no | no | the exact definition version behind every figure. Without this a number cannot be compared to the same number from last quarter |
| `figures` | json | yes | no | — | no | no |  |
| `rows_returned` | int | yes | no | — | no | no |  |
| `rows_suppressed_by_permission` | int | yes | no | — | no | no | recorded but NEVER rendered to the reader, because showing it discloses how many records exist outside their scope. It exists so that a persistently non-zero value is visible to an operator as an index-versus-permission divergence |
| `rows_suppressed_by_small_population` | int | yes | no | — | no | no | cells suppressed because the population was too small to render without identifying an individual |
| `data_as_of` | timestamptz | yes | no | — | no | no | the freshness of the underlying data, stated on every rendering |
| `executed_at` | timestamptz | yes | yes | — | no | no |  |
| `duration_ms` | int | yes | no | — | no | no |  |
| `trigger` | enum | yes | no | — | no | no |  |
| `exported` | bool | yes | no | — | no | no |  |

## 2. Lifecycle

States: `running`, `completed`, `failed`, `expired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `running` | GAP | GAP | GAP | entity-specific, see capability model |
| `completed` | GAP | GAP | GAP | entity-specific, see capability model |
| `failed` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A run is immutable. Re-running produces a new run, so a figure quoted from a run remains reproducible even after the underlying data changes.
2. rows_suppressed_by_permission is recorded and is never rendered to the reader. A count of what was withheld is a disclosure about records outside their scope.
3. metric_versions and data_as_of are both mandatory and both rendered. A number without its definition version and its freshness cannot be compared to anything.
4. Figures are computed under run_for_principal_id's scope and never under the report author's or a scheduler's service identity.
5. A run whose figures were suppressed by small population states that suppression occurred without stating where, because stating where reintroduces the disclosure.

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

- Permission matrix: `14-PERMISSIONS/reporting/report_run.md`
- Screen specifications: `11-UX/screens/reporting/report_run/`
- Test catalogue: `20-TESTING/reporting/report_run/`
