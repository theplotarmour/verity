---
doc_id: ENT-ROLE_BINDING
title: Entity — Role Binding
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Role Binding

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Capability/module:** `core_authorization` · **Owner scope:** `tenant`

The grant of one role to one principal, bounded by concrete scope values. This is where "supervisor" becomes "supervisor of these three locations".

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `role_id` | uuid | yes | no | — | no | no |  |
| `scope_bindings` | json | yes | no | — | no | no | concrete values per scope kind, for example own_site resolves to a list of site references obtained through the org_structure port; empty means the role grants nothing |
| `granted_by_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `granted_at` | timestamptz | yes | yes | — | no | no |  |
| `expires_at` | timestamptz | no | no | — | no | no | null means indefinite; a bounded binding is the mechanism behind temporary cover |
| `reason` | text | no | no | — | no | no | required when the role carries an archetype in the elevated set |
| `revoked_at` | timestamptz | no | no | — | no | no |  |
| `revoked_by_principal_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `active`, `expiring`, `expired`, `revoked`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `expiring` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |
| `revoked` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. unique(principal_id, role_id, tenant_id) among non-revoked bindings. Two live bindings of the same role to the same principal cannot differ meaningfully, because scope bindings are a union.
2. A binding whose scope_bindings are empty for every scope kind the role's grants require is rejected at write time with a message naming the missing scope. Silently granting nothing is the single most confusing failure a new administrator can produce.
3. expires_at in the past is not a valid write. Retroactive revocation is revoke_binding with a reason, not a backdated expiry, because the two produce different audit narratives.

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

- Permission matrix: `14-PERMISSIONS/core_authorization/role_binding.md`
- Screen specifications: `11-UX/screens/core_authorization/role_binding/`
- Test catalogue: `20-TESTING/core_authorization/role_binding/`
