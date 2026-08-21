---
doc_id: ENT-PERMISSION_GRANT
title: Entity — Permission Grant
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Permission Grant

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Capability/module:** `core_authorization` · **Owner scope:** `tenant`

One row of (verb x entity x field_set x scope x condition) attached to a role. The atom of the whole authorization model.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `role_id` | uuid | yes | no | — | no | no |  |
| `effect` | enum | yes | no | — | no | no | deny is evaluated last and wins; it exists so a broad allow can be carved out without cloning a role |
| `verb` | enum | yes | no | — | no | no | from the closed vocabulary verb set only |
| `entity_key` | string | yes | no | — | no | no | the entity this grant applies to, or the literal * for a capability-wide grant |
| `capability_key` | string | yes | no | — | no | no |  |
| `field_set_mode` | enum | yes | no | — | no | no |  |
| `field_list` | json | no | no | — | no | no | required when field_set_mode is explicit, forbidden otherwise |
| `scope` | enum | yes | no | — | no | no | from the closed vocabulary scope set only |
| `condition_expression` | text | no | no | — | no | no | an Expression (K16), sandboxed, side-effect-free, statically cost-bounded, evaluated last |
| `created_at` | timestamptz | yes | yes | — | no | no |  |
| `created_by_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |

## 2. Lifecycle

States: `active`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. field_set_mode=explicit requires a non-empty field_list. field_set_mode in (all, all_except_gated) requires field_list to be null. A grant that carries both is ambiguous and is rejected at write time, not resolved by precedence.
2. A grant with verb in (view_financial, view_sensitive) is a field-level gate, never an entity-level gate. Emitting it with field_set_mode=all is a modelling error and is rejected.
3. scope=platform may only appear on a role whose archetypes include platform_operator or platform_support. Enforced at write time so a tenant administrator cannot mint a cross-tenant grant even by direct API call.
4. A condition_expression may only traverse relationships the evaluating principal could traverse unaided. Otherwise configuration becomes a data-exfiltration channel - kernel K16.

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

- Permission matrix: `14-PERMISSIONS/core_authorization/permission_grant.md`
- Screen specifications: `11-UX/screens/core_authorization/permission_grant/`
- Test catalogue: `20-TESTING/core_authorization/permission_grant/`
