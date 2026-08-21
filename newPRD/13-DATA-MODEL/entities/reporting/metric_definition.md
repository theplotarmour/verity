---
doc_id: ENT-METRIC_DEFINITION
title: Entity — Metric Definition
generated: true
source_model: _model/capabilities/reporting.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Metric Definition

*This document is generated. Edit `_model/capabilities/reporting.yaml`, not this file.*

**Capability/module:** `reporting` · **Owner scope:** `tenant`

One agreed meaning for one number - what it counts, over what, excluding what, and who agreed to it.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `decision_question` | text | yes | no | — | no | no | the question this number is for, phrased as an operator would ask it. Mandatory - a metric with no decision behind it is decoration, and the kernel excludes decoration |
| `source_capability_key` | string | yes | no | — | no | no |  |
| `source_entity_or_event` | string | yes | no | — | no | no |  |
| `aggregation` | enum | yes | no | — | no | no |  |
| `percentile` | decimal | no | no | — | no | no |  |
| `measure_field` | string | no | no | — | no | no |  |
| `filter_expression` | text | no | no | — | no | no | an Expression, statically cost-bounded like every other |
| `exclusions` | json | no | no | — | no | no | flat list of exclusion keys - excluded SLA measurements, excluded billable outcomes, voided orders. Every exclusion elsewhere in the platform is visible here, because a number that silently omits excluded records is a number that flatters |
| `time_basis` | enum | yes | no | — | no | no | MANDATORY with no default. The same events counted by business time and by system time give different answers whenever anything arrives late, which in a field operation is constantly |
| `grain` | enum | yes | no | — | no | no |  |
| `denominator_definition` | text | no | no | — | no | no | required for ratio and rate, because a ratio whose denominator is unstated is two different numbers |
| `target_value` | decimal | no | no | — | no | no |  |
| `direction_of_good` | enum | yes | no | — | no | no | without this a number cannot be rendered with any indication of whether it is good, and every surface then invents its own |
| `owner_principal_id` | uuid | yes | no | — | no | no | who agreed to this definition and answers for it |
| `version_number` | int | yes | no | — | no | no |  |
| `agreed_at` | timestamptz | no | no | — | no | no |  |
| `sensitive` | bool | yes | no | — | no | no |  |
| `financial` | bool | yes | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `agreed`, `superseded`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `agreed` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. decision_question is mandatory and non-empty. A metric that cannot name the decision it informs is a dashboard tile, and the kernel excludes dashboards.
2. time_basis is mandatory with no default at any scope. Counting by business time and by system time gives different answers whenever anything arrives late, and an unstated basis means two people comparing the same metric are comparing different things.
3. aggregation=ratio or rate requires denominator_definition, and percentile requires percentile.
4. A definition is never edited after any report has published a figure from it. A change is a new version, and every published figure records the version it was computed under, so a comparison across a definition change is detectable rather than misleading.
5. financial or sensitive definitions are gated on read by the same verbs that gate their underlying fields. A metric is not a way around a field gate.

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

- Permission matrix: `14-PERMISSIONS/reporting/metric_definition.md`
- Screen specifications: `11-UX/screens/reporting/metric_definition/`
- Test catalogue: `20-TESTING/reporting/metric_definition/`
