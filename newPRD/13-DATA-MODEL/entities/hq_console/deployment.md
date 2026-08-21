---
doc_id: ENT-DEPLOYMENT
title: Entity — Deployment
generated: true
source_model: _model/capabilities/hq_console.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Deployment

*This document is generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

**Capability/module:** `hq_console` · **Owner scope:** `platform`

One act of changing what one or many tenants are running, with its scope, its rehearsal, its approval and its outcome per tenant.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `kind` | enum | yes | no | — | no | no | rollback_forward rather than rollback, because the platform's rollback strategy is unresolved and naming a state rollback would imply a capability that has not been established |
| `target_selector` | text | yes | no | — | no | no | which tenants, as an expression. An explicit selector rather than a list, so the blast radius is computed and shown rather than assembled by hand |
| `target_tenant_count` | int | yes | no | — | no | no | computed at planning and shown in the confirmation. The number that determines how carefully this is done |
| `from_versions` | json | yes | no | — | no | no |  |
| `to_versions` | json | yes | no | — | no | no |  |
| `is_breaking` | bool | yes | no | — | no | no |  |
| `broken_override_count` | int | yes | no | — | no | no | overrides across all targets that this deployment invalidates, computed before approval |
| `rehearsal_run_ref` | string | no | no | — | no | no |  |
| `rehearsal_outcome` | enum | yes | no | — | no | no |  |
| `approved_by_principal_id` | uuid | no | no | — | no | no |  |
| `approval_reason` | text | no | no | — | no | no |  |
| `wave_size` | int | yes | no | — | no | no | how many tenants per wave. A deployment to every tenant at once is a decision that should require saying so |
| `started_at` | timestamptz | no | no | — | no | no |  |
| `completed_at` | timestamptz | no | no | — | no | no |  |
| `succeeded_count` | int | yes | no | — | no | no |  |
| `failed_count` | int | yes | no | — | no | no |  |
| `halted_reason` | text | no | no | — | no | no |  |

## 2. Lifecycle

States: `planned`, `rehearsing`, `approved`, `deploying`, `completed`, `halted`, `cancelled`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `planned` | GAP | GAP | GAP | entity-specific, see capability model |
| `rehearsing` | GAP | GAP | GAP | entity-specific, see capability model |
| `approved` | GAP | GAP | GAP | entity-specific, see capability model |
| `deploying` | GAP | GAP | GAP | entity-specific, see capability model |
| `completed` | GAP | GAP | GAP | entity-specific, see capability model |
| `halted` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A deployment affecting more than one tenant proceeds in waves, and a wave failing beyond the halt threshold stops the deployment. A change that fails for one tenant will usually fail for the rest, and continuing turns one incident into fifty.
2. broken_override_count is computed before approval and shown in it. Per the composition model, broken overrides block an upgrade in staging and are never silently dropped; this field is what makes them visible before anybody approves.
3. is_breaking true requires a recorded approval with a reason regardless of the target count, including a target count of one.
4. A deployment is never edited after it starts. A change of plan halts it and a new deployment carries the revised plan.
5. kind=rollback_forward is a forward deployment restoring previous versions. The model does not offer a reverse migration, because DEC-K-011 is unresolved and the evidence gathered establishes that forward-only is the norm in this class of platform.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `platform_scoped`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/hq_console/deployment.md`
- Screen specifications: `11-UX/screens/hq_console/deployment/`
- Test catalogue: `20-TESTING/hq_console/deployment/`
