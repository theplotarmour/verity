---
doc_id: ENT-DELEGATION
title: Entity — Delegation
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Delegation

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Capability/module:** `core_authorization` · **Owner scope:** `tenant`

A time-boxed, revocable, non-transitive transfer of a subset of one principal's authority to another, for cover during absence.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `from_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `to_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `verb_subset` | json | yes | no | — | no | no | which verbs are delegated; may never exceed what the delegator holds at the moment of evaluation, not at the moment of creation |
| `entity_subset` | json | no | no | — | no | no | null means every entity the delegator can act on, narrowed by verb_subset |
| `scope_narrowing` | json | no | no | — | no | no | an optional narrowing of the delegator's scope bindings, never a widening |
| `starts_at` | timestamptz | yes | no | — | no | no |  |
| `ends_at` | timestamptz | yes | no | — | no | no |  |
| `reason` | text | yes | no | — | no | no |  |
| `revoked_at` | timestamptz | no | no | — | no | no |  |

## 2. Lifecycle

States: `scheduled`, `active`, `ended`, `revoked`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `scheduled` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `ended` | GAP | GAP | GAP | entity-specific, see capability model |
| `revoked` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. ends_at > starts_at, and ends_at - starts_at may not exceed max_delegation_days. An unbounded delegation is a role binding wearing a disguise, and should be modelled as one so that it appears in an access review.
2. A delegated authority is evaluated against what the delegator holds AT REQUEST TIME. If the delegator loses a permission, the delegate loses it in the same instant. Snapshotting the delegator's permissions at creation time would outlive the delegator's own access, which is the classic delegation privilege-retention bug.
3. Delegation is not transitive. A principal acting under a delegation may not create a delegation. Enforced at write time.
4. verb_subset may never contain administer. Delegating the ability to reconfigure the entity type itself is not cover for an absence; it is a permanent transfer and must be modelled as a role binding.

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

- Permission matrix: `14-PERMISSIONS/core_authorization/delegation.md`
- Screen specifications: `11-UX/screens/core_authorization/delegation/`
- Test catalogue: `20-TESTING/core_authorization/delegation/`
