---
doc_id: ENT-LEGAL_HOLD
title: Entity — Legal Hold
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Legal Hold

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

**Capability/module:** `core_audit` · **Owner scope:** `tenant`

A named, referenced, time-bounded suspension of retention expiry over a defined set of audit records and the entities they concern.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `reference` | string | yes | no | — | no | no | the external matter reference - a case number, a regulator notice, an internal investigation id |
| `scope_expression` | text | yes | no | — | no | no | an Expression selecting the records under hold - by subject, by actor, by capability, by date window; statically cost-bounded like every other expression |
| `applied_by_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `applied_at` | timestamptz | yes | yes | — | no | no |  |
| `expected_release_at` | timestamptz | no | no | — | no | no |  |
| `released_at` | timestamptz | no | no | — | no | no |  |
| `released_by_principal_id` | uuid | no | no | — | no | no |  |
| `release_reason` | text | no | no | — | no | no |  |
| `affected_record_count` | bigint | no | no | — | no | no | computed at apply time and recomputed on each review |

## 2. Lifecycle

States: `active`, `under_review`, `released`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `under_review` | GAP | GAP | GAP | entity-specific, see capability model |
| `released` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. The principal who applies a hold may not release it if they are also within its scope_expression as an actor. Self-releasing a hold over one's own actions is the exact scenario the control exists to prevent.
2. A hold may widen but may never narrow while active. Narrowing is release plus re-apply, so the audit shows records leaving the hold rather than showing a hold quietly shrinking.
3. Applying a hold never modifies the held records other than their retention_class. A hold that rewrote records would destroy the thing it is protecting.

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

- Permission matrix: `14-PERMISSIONS/core_audit/legal_hold.md`
- Screen specifications: `11-UX/screens/core_audit/legal_hold/`
- Test catalogue: `20-TESTING/core_audit/legal_hold/`
