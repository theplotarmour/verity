---
doc_id: ENT-CONFIG_CHANGE_SET
title: Entity — Configuration Change Set
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Configuration Change Set

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

**Capability/module:** `core_configuration` · **Owner scope:** `tenant`

A group of configuration changes that must be applied together, versioned, reviewable, and deployable through the staging-first path.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `changes` | json | yes | no | — | no | no | array of proposed config_value writes; a list of scalars-per-change rather than a nested object, so it stays diffable |
| `highest_change_impact` | enum | yes | no | — | no | no | computed as the maximum across the set, which is what determines the deployment path for the whole set. A set is only as safe as its riskiest member |
| `created_by_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `created_at` | timestamptz | yes | yes | — | no | no |  |
| `staging_run_ref` | string | no | no | — | no | no | reference to the automated acceptance run in the tenant's staging environment |
| `approved_by_principal_id` | uuid | no | no | — | no | no |  |
| `applied_at` | timestamptz | no | no | — | no | no |  |
| `rollback_of_change_set_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `staged`, `approved`, `applied`, `abandoned`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `staged` | GAP | GAP | GAP | entity-specific, see capability model |
| `approved` | GAP | GAP | GAP | entity-specific, see capability model |
| `applied` | GAP | GAP | GAP | entity-specific, see capability model |
| `abandoned` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A change set containing any member whose change_impact is requires_staging or requires_migration may not be applied to production without a completed staging run and a recorded human approval.
2. A change set is applied atomically. Half an applied set is a configuration state nobody designed and nobody can reason about.
3. A rollback is a NEW change set that restores previous values, never an undo of the original. This keeps the history linear and is consistent with the platform's forward-only posture pending DEC-K-011.

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

- Permission matrix: `14-PERMISSIONS/core_configuration/config_change_set.md`
- Screen specifications: `11-UX/screens/core_configuration/config_change_set/`
- Test catalogue: `20-TESTING/core_configuration/config_change_set/`
