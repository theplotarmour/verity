---
doc_id: ENT-REPORT
title: Entity — Report
generated: true
source_model: _model/capabilities/reporting.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Report

*This document is generated. Edit `_model/capabilities/reporting.yaml`, not this file.*

**Capability/module:** `reporting` · **Owner scope:** `tenant`

A named, permission-projected, drillable answer to a question, with its metrics, its dimensions and its delivery.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `decision_question` | text | yes | no | — | no | no |  |
| `metric_keys` | json | yes | no | — | no | no | flat list |
| `dimension_keys` | json | no | no | — | no | no | flat list of grouping dimensions, each resolving through a capability port rather than by joining its tables |
| `default_period` | enum | yes | no | — | no | no |  |
| `audience_role_keys` | json | yes | no | — | no | no | who this report is for, expressed as roles. A report addressed to a person dies when they leave, exactly as a notification does |
| `drill_target` | string | no | no | — | no | no | which entity a figure drills into. Mandatory for any metric a person will be asked to act on, because a number nobody can drill is a number they will disbelieve |
| `schedule_cron` | string | no | no | — | no | no |  |
| `schedule_channel` | enum | yes | no | — | no | no |  |
| `freshness_target_minutes` | int | yes | no | — | no | no |  |
| `row_limit` | int | yes | no | — | no | no |  |
| `owner_principal_id` | uuid | yes | no | — | no | no |  |
| `source_pack_key` | string | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `published`, `broken`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `published` | GAP | GAP | GAP | entity-specific, see capability model |
| `broken` | GAP | GAP | GAP | entity-specific, see capability model |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. decision_question is mandatory. A report that cannot name its decision is a dashboard.
2. audience is expressed as roles, never as principals, for the same reason notification audiences are.
3. A report is executed under the scope of whoever runs it. A scheduled report is executed and delivered per recipient under that recipient's own scope, never once under its author's scope and then distributed.
4. Every metric in a report shares a compatible time_basis, or the report declares which basis it presents and states it on every rendering. Mixing bases silently within one report is how two figures on one page disagree.
5. drill_target is mandatory for any metric with direction_of_good other than none, because those are the numbers somebody will be asked about.

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

- Permission matrix: `14-PERMISSIONS/reporting/report.md`
- Screen specifications: `11-UX/screens/reporting/report/`
- Test catalogue: `20-TESTING/reporting/report/`
