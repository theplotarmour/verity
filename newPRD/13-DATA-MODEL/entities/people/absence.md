---
doc_id: ENT-ABSENCE
title: Entity — Absence
generated: true
source_model: _model/capabilities/people.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Absence

*This document is generated. Edit `_model/capabilities/people.yaml`, not this file.*

**Capability/module:** `people` · **Owner scope:** `tenant`

A recorded period during which a member is not available, whatever the reason.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `member_id` | uuid | yes | no | — | no | no |  |
| `absence_kind` | enum | yes | no | — | no | no |  |
| `starts_at` | timestamptz | yes | no | — | no | no |  |
| `ends_at` | timestamptz | yes | no | — | no | no |  |
| `is_part_period` | bool | yes | no | — | no | no |  |
| `reason_text` | text | no | no | — | yes | no | sensitive because a reason for a medical absence is health information. The KIND is visible to a dispatcher; the reason is not |
| `evidence_ref` | string | no | no | — | yes | no |  |
| `notified_at` | timestamptz | no | no | — | no | no | when the member told the tenant, which is a different fact from when the absence started and is the fact that matters for an unplanned absence |
| `approved_by_principal_id` | uuid | no | no | — | no | no |  |
| `affects_availability` | bool | yes | no | — | no | no | false for a training absence that still counts as engaged. Explicit because the alternative is inferring it from the kind, which is wrong for at least one tenant |

## 2. Lifecycle

States: `requested`, `approved`, `active`, `completed`, `cancelled`, `rejected`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `requested` | GAP | GAP | GAP | entity-specific, see capability model |
| `approved` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `completed` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |
| `rejected` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. ends_at > starts_at.
2. Overlapping absences for one member are rejected at write time. Two overlapping absences make "is this person available" unanswerable without a precedence rule nobody has agreed.
3. reason_text and evidence_ref are gated by view_sensitive. A dispatcher needs to know somebody is absent and does not need to know why.
4. An absence may not be deleted once any assignment decision was taken against it. It is cancelled, which leaves the record of the decision intact.

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

- Permission matrix: `14-PERMISSIONS/people/absence.md`
- Screen specifications: `11-UX/screens/people/absence/`
- Test catalogue: `20-TESTING/people/absence/`
