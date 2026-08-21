---
doc_id: ENT-ATTENDANCE_DISPUTE
title: Entity — Attendance Dispute
generated: true
source_model: _model/capabilities/attendance_verification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Attendance Dispute

*This document is generated. Edit `_model/capabilities/attendance_verification.yaml`, not this file.*

**Capability/module:** `attendance_verification` · **Owner scope:** `tenant`

A recorded disagreement about an attendance record, with the position of each side and the evidence each relies on.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `attendance_record_id` | uuid | yes | no | — | no | no |  |
| `raised_by` | enum | yes | no | — | no | no |  |
| `raised_by_principal_id` | uuid | no | no | — | no | no |  |
| `disputed_field` | enum | yes | no | — | no | no |  |
| `claimed_position` | text | yes | no | — | no | no |  |
| `counter_position` | text | no | no | — | no | no |  |
| `supporting_evidence_refs` | json | no | no | — | no | no | flat list of evidence references from either side |
| `outcome` | enum | yes | no | — | no | no |  |
| `outcome_reason` | text | no | no | — | no | no |  |
| `resolved_by_principal_id` | uuid | no | no | — | no | no |  |
| `resolved_at` | timestamptz | no | no | — | no | no |  |
| `financial_effect_minor` | money_minor | no | no | — | no | yes |  |

## 2. Lifecycle

States: `raised`, `under_review`, `resolved`, `withdrawn`, `escalated`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `raised` | GAP | GAP | GAP | entity-specific, see capability model |
| `under_review` | GAP | GAP | GAP | entity-specific, see capability model |
| `resolved` | GAP | GAP | GAP | entity-specific, see capability model |
| `withdrawn` | GAP | GAP | GAP | entity-specific, see capability model |
| `escalated` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A dispute blocks settlement of its record but never blocks further evidence being attached. Freezing evidence collection during a dispute would mean the party who raised it controls what can be shown.
2. outcome_reason is mandatory for any outcome other than withdrawn.
3. The resolving principal may not be the raising principal. Deciding one's own dispute is not a resolution.
4. Both parties see the same evidence set. There is no evidence visible to one side only, because a dispute resolved on evidence one party could not see is not resolved.

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

- Permission matrix: `14-PERMISSIONS/attendance_verification/attendance_dispute.md`
- Screen specifications: `11-UX/screens/attendance_verification/attendance_dispute/`
- Test catalogue: `20-TESTING/attendance_verification/attendance_dispute/`
