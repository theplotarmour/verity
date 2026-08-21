---
doc_id: ENT-ROLE
title: Entity — Role
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Role

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Capability/module:** `core_authorization` · **Owner scope:** `tenant`

A named bundle of permission grants, instantiated per tenant, mapped to one or more platform role archetypes.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no | stable machine key; the display label is separately overridable by the terminology map so renaming a role in the UI never breaks a pack binding |
| `label` | string | yes | no | — | no | no |  |
| `archetypes` | json | yes | no | — | no | no | array of role_archetype keys from the vocabulary; drives pack-shipped default grants and MFA requirements |
| `is_system` | bool | yes | no | — | no | no | system roles may be cloned but never deleted or edited |
| `source_pack_key` | string | no | no | — | no | no | which pack shipped this role, null for tenant-authored roles; used to decide upgrade behaviour |
| `source_capability_version` | string | no | no | — | no | no | the capability version the grants were authored against, per the composition override model |
| `assignable_scopes` | json | yes | no | — | no | no | which scope kinds may be bound when this role is granted to a principal |
| `requires_mfa` | bool | yes | no | — | no | no |  |
| `requires_elevation_for` | json | no | no | — | no | no | array of action keys that demand an elevated session beyond the kernel-mandated set; a tenant may add, never remove |
| `created_at` | timestamptz | yes | yes | — | no | no |  |
| `created_by_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port; deliberately not a foreign key, per kernel K04 |

## 2. Lifecycle

States: `draft`, `active`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. A role with zero grants is legal and is how a placeholder role is staged, but it may not be bound to any principal until it has at least one grant. A bound empty role is indistinguishable to a user from a broken permission system.
2. archetypes may never be empty. An archetype-less role cannot receive pack defaults and cannot be reasoned about by any other capability.
3. A role carrying the tenant_owner archetype may not be deleted while it is the only such role with an active binding.

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

- Permission matrix: `14-PERMISSIONS/core_authorization/role.md`
- Screen specifications: `11-UX/screens/core_authorization/role/`
- Test catalogue: `20-TESTING/core_authorization/role/`
