---
doc_id: ENT-ATTENDANCE_RECORD
title: Entity — Attendance Record
generated: true
source_model: _model/capabilities/attendance_verification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Attendance Record

*This document is generated. Edit `_model/capabilities/attendance_verification.yaml`, not this file.*

**Capability/module:** `attendance_verification` · **Owner scope:** `tenant`

One person's presence against one commitment, with what was claimed, what was verified, and what was finally agreed.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `resource_ref` | uuid | yes | no | — | no | no | the person, resolved through the schedulable_resource port |
| `commitment_ref` | uuid | no | no | — | no | no | the assignment this attends against, resolved through the schedulable_demand port. Null for attendance with no scheduled commitment, which is common and must be recordable |
| `location_ref` | uuid | no | no | — | no | no | resolved through the org_structure port |
| `operating_day` | date | yes | no | — | no | no | computed from the location calendar day_boundary_time at write time and then FROZEN. Recomputing it later would move somebody's hours between days when a calendar is edited |
| `claimed_start_at` | timestamptz | no | no | — | no | no | what the person asserted |
| `claimed_end_at` | timestamptz | no | no | — | no | no |  |
| `verified_start_at` | timestamptz | no | no | — | no | no | what evidence supports. Deliberately a separate field from the claim - overwriting one with the other destroys the fact that they differed, which is exactly what a dispute is about |
| `verified_end_at` | timestamptz | no | no | — | no | no |  |
| `agreed_start_at` | timestamptz | no | no | — | no | no | what pay and billing consume, after any adjustment. Null until the record is settled |
| `agreed_end_at` | timestamptz | no | no | — | no | no |  |
| `start_evidence_strength` | enum | yes | no | — | no | no | an ordered ladder. Recorded rather than collapsed to verified-or-not, because the strength is what decides who wins a dispute |
| `end_evidence_strength` | enum | yes | no | — | no | no |  |
| `start_evidence_ref` | string | no | no | — | no | no | reference through the evidence_capture port |
| `end_evidence_ref` | string | no | no | — | no | no |  |
| `start_position_verdict` | enum | yes | no | — | no | no | three-valued plus not-evaluated, per the presence_evidence port contract. Never a boolean |
| `end_position_verdict` | enum | yes | no | — | no | no |  |
| `start_margin_m` | int | no | no | — | no | no | how far inside or outside the boundary. Outside by three metres and outside by four kilometres are different facts |
| `end_margin_m` | int | no | no | — | no | no |  |
| `break_minutes` | int | yes | no | — | no | no |  |
| `payable_minutes` | int | no | no | — | no | no | derived from the agreed period and the tenant rounding rule. Null until settled |
| `billable_minutes` | int | no | no | — | no | yes | derived separately from payable_minutes, because the two may legitimately differ and forcing one number is wrong for one of the parties |
| `substitution_of_resource_ref` | uuid | no | no | — | no | no | set where this person covered for somebody else |
| `recorded_by_principal_id` | uuid | yes | no | — | no | no | resolved through the principal_directory port. Frequently not the person the record is about |
| `source` | enum | yes | no | — | no | no |  |
| `device_ref` | uuid | no | no | — | no | no |  |
| `sync_lag_minutes` | int | no | no | — | no | no | recorded_at minus occurred_at. Retained and reportable, because a fortnight of records arriving in one burst is the shape of both a broken handset and a fabrication |
| `dispute_id` | uuid | no | no | — | no | no |  |
| `locked_at` | timestamptz | no | no | — | no | no | set when a downstream period closes. After this the record can only be corrected by a new adjustment, never edited |

## 2. Lifecycle

States: `open`, `claimed`, `verified`, `disputed`, `settled`, `locked`, `voided`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `open` | GAP | GAP | GAP | entity-specific, see capability model |
| `claimed` | GAP | GAP | GAP | entity-specific, see capability model |
| `verified` | GAP | GAP | GAP | entity-specific, see capability model |
| `disputed` | GAP | GAP | GAP | entity-specific, see capability model |
| `settled` | GAP | GAP | GAP | entity-specific, see capability model |
| `locked` | GAP | GAP | GAP | entity-specific, see capability model |
| `voided` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. claimed, verified and agreed periods are three separate pairs of fields and none may be written over another. Any settlement writes agreed and leaves the other two intact.
2. agreed_end_at, where set, is after agreed_start_at.
3. billable_minutes is gated by view_financial. payable_minutes is not, because a person must be able to see their own recorded hours.
4. A record with locked_at set is immutable. Corrections after lock are new adjustment rows referencing it, so that a closed payroll period can never change underneath a payment that has already been made.
5. operating_day is frozen at write time. Recomputing it from a later calendar edit would silently move hours between days and therefore between pay periods.
6. A record may not be settled while an open dispute references it.
7. Every write is offline-queueable, and none of it is offline-editable once verified. A verified period edited on a device that has been offline for two days is an edit made against stale evidence.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `tenant_scoped_with_site_partition`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/attendance_verification/attendance_record.md`
- Screen specifications: `11-UX/screens/attendance_verification/attendance_record/`
- Test catalogue: `20-TESTING/attendance_verification/attendance_record/`
