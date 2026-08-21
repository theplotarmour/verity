---
doc_id: ENT-ATTENDANCE_ADJUSTMENT
title: Entity — Attendance Adjustment
generated: true
source_model: _model/capabilities/attendance_verification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Attendance Adjustment

*This document is generated. Edit `_model/capabilities/attendance_verification.yaml`, not this file.*

**Capability/module:** `attendance_verification` · **Owner scope:** `tenant`

A recorded correction to an attendance period, with who made it, why, and what it changes for pay and for billing separately.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `attendance_record_id` | uuid | yes | no | — | no | no |  |
| `adjustment_kind` | enum | yes | no | — | no | no |  |
| `field_adjusted` | enum | yes | no | — | no | no |  |
| `previous_value` | text | yes | no | — | no | no |  |
| `new_value` | text | yes | no | — | no | no |  |
| `affects_pay` | bool | yes | no | — | no | no |  |
| `affects_billing` | bool | yes | no | — | no | yes | separate from affects_pay deliberately. A goodwill credit to a counterparty must not silently reduce somebody's wages |
| `reason` | text | yes | no | — | no | no |  |
| `made_by_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `made_at` | timestamptz | yes | yes | — | no | no |  |
| `approved_by_principal_id` | uuid | no | no | — | no | no |  |
| `person_notified_at` | timestamptz | no | no | — | no | no | when the person whose hours changed was told. Mandatory for any adjustment where affects_pay is true and the change is downward |

## 2. Lifecycle

States: `proposed`, `applied`, `reversed`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `proposed` | GAP | GAP | GAP | entity-specific, see capability model |
| `applied` | GAP | GAP | GAP | entity-specific, see capability model |
| `reversed` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. An adjustment is append-only and is never edited. A wrong adjustment is corrected by a further adjustment, so the sequence of corrections is itself visible.
2. reason is mandatory and may not be empty or whitespace. An unexplained adjustment to somebody's hours is indistinguishable from an alteration.
3. Any adjustment with affects_pay true and a downward effect must record person_notified_at before the containing period locks. Reducing somebody's pay without telling them is not a configuration option.
4. affects_pay and affects_billing are independent. Setting one never implies the other.
5. An adjustment against a locked record is permitted and is how post-lock corrections work. An adjustment that would edit a locked record's own fields is not.

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

- Permission matrix: `14-PERMISSIONS/attendance_verification/attendance_adjustment.md`
- Screen specifications: `11-UX/screens/attendance_verification/attendance_adjustment/`
- Test catalogue: `20-TESTING/attendance_verification/attendance_adjustment/`
