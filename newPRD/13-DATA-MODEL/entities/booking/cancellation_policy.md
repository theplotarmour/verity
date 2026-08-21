---
doc_id: ENT-CANCELLATION_POLICY
title: Entity — Cancellation Policy
generated: true
source_model: _model/capabilities/booking.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Cancellation Policy

*This document is generated. Edit `_model/capabilities/booking.yaml`, not this file.*

**Capability/module:** `booking` · **Owner scope:** `tenant`

What happens to a deposit and to any charge when a booking is cancelled, rescheduled or not attended, expressed as thresholds rather than as code.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `free_cancellation_hours` | int | yes | no | — | no | no | notice before starts_at within which cancellation costs nothing |
| `late_cancellation_charge_percent` | int | yes | no | — | no | yes |  |
| `no_show_charge_percent` | int | yes | no | — | no | yes |  |
| `deposit_percent` | int | yes | no | — | no | yes |  |
| `deposit_refundable_before_hours` | int | no | no | — | no | yes |  |
| `free_reschedules` | int | yes | no | — | no | no |  |
| `reschedule_charge_percent` | int | yes | no | — | no | yes |  |
| `applies_to_channels` | json | no | no | — | no | no | flat list of booking channels. A telephone booking and a self-service booking may legitimately carry different terms |
| `disclosure_text` | text | yes | no | — | no | no | the exact wording shown to the person at the moment of booking. Mandatory, because a charge that was never disclosed is a charge that will be reversed |

## 2. Lifecycle

States: `draft`, `active`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `active` | False | True | True | In normal operational use. |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. Percentages are between 0 and 100.
2. disclosure_text is mandatory and non-empty. A cancellation charge nobody was shown is not enforceable and will be reversed at the first complaint.
3. A policy is never edited after a booking references it. A change is a new policy, and existing bookings keep the terms they were shown.
4. Financial fields are gated by view_financial. disclosure_text is not, because the person booking must always be able to read it.

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

- Permission matrix: `14-PERMISSIONS/booking/cancellation_policy.md`
- Screen specifications: `11-UX/screens/booking/cancellation_policy/`
- Test catalogue: `20-TESTING/booking/cancellation_policy/`
