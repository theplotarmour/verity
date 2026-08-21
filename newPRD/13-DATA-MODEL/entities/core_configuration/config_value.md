---
doc_id: ENT-CONFIG_VALUE
title: Entity — Configuration Value
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Configuration Value

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

**Capability/module:** `core_configuration` · **Owner scope:** `tenant`

One value set at one scope. The resolved answer for a principal is the narrowest of these that applies.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no | null is not permitted here even for platform-set values; a platform default lives in config_definition, not as a tenant_id-less row, so that row-level security has nothing to special-case |
| `config_key` | string | yes | yes | — | no | no |  |
| `scope_kind` | enum | yes | yes | — | no | no |  |
| `scope_ref` | uuid | no | yes | — | no | no | the site, role or user this value applies to, resolved through the org_structure or principal_directory port; null when scope_kind is tenant or pack_default |
| `value` | text | no | no | — | no | no | serialised per the definition's value_type. Null is legal only where the definition declares nullable_meaning |
| `set_by_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `set_at` | timestamptz | yes | no | — | no | no |  |
| `reason` | text | no | no | — | no | no | required where the definition is financial or sensitive |
| `source_pack_key` | string | no | no | — | no | no | set when the value arrived from a pack rather than from a person |
| `authored_against_capability_version` | string | no | no | — | no | no | per the composition model's override upgrade semantics - every override records the version it was authored against |
| `effective_from` | timestamptz | no | no | — | no | no | a scheduled change; null means immediately |
| `superseded_at` | timestamptz | no | no | — | no | no |  |
| `superseded_by_value_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `scheduled`, `active`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `scheduled` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. unique(tenant_id, config_key, scope_kind, scope_ref) among non-superseded rows. Two live values at the same scope for the same key is not a state anyone can resolve.
2. scope_kind may never be narrower than the definition's lowest_settable_scope. Enforced at write time against the definition, not at read time, so an illegal value can never exist to be resolved.
3. A value is never edited. A change supersedes the previous row. The history is the entity, and the current value is a query over it.
4. A value whose definition has been retired is retained and stops participating in resolution. It is not deleted, because "what was this set to before the migration" is a question somebody asks during an incident.

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

- Permission matrix: `14-PERMISSIONS/core_configuration/config_value.md`
- Screen specifications: `11-UX/screens/core_configuration/config_value/`
- Test catalogue: `20-TESTING/core_configuration/config_value/`
