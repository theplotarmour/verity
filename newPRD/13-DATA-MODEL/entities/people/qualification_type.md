---
doc_id: ENT-QUALIFICATION_TYPE
title: Entity — Qualification Type
generated: true
source_model: _model/capabilities/people.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Qualification Type

*This document is generated. Edit `_model/capabilities/people.yaml`, not this file.*

**Capability/module:** `people` · **Owner scope:** `tenant`

The definition of a kind of competence - how long it lasts, whether it may be self-declared, whether it blocks engagement, and what evidence it needs.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `never_expires` | bool | yes | no | — | no | no |  |
| `default_validity_months` | int | no | no | — | no | no |  |
| `mandatory_for_engagement` | bool | yes | no | — | no | no |  |
| `evidence_required` | bool | yes | no | — | no | no |  |
| `self_declarable` | bool | yes | no | — | no | no | whether the member may claim it themselves. A self-declarable qualification that is also mandatory_for_engagement is a contradiction and is rejected |
| `renewal_lead_days` | int | yes | no | — | no | no |  |
| `source_pack_key` | string | no | no | — | no | no |  |

## 2. Lifecycle

States: `active`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. never_expires and default_validity_months are mutually exclusive.
2. A type that is mandatory_for_engagement may not be self_declarable. Allowing a person to self-certify the thing that gates their engagement removes the gate.
3. Deleting a type is not offered while any qualification references it. Types are archived, because an incident review needs to resolve what a historical qualification meant.

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

- Permission matrix: `14-PERMISSIONS/people/qualification_type.md`
- Screen specifications: `11-UX/screens/people/qualification_type/`
- Test catalogue: `20-TESTING/people/qualification_type/`
