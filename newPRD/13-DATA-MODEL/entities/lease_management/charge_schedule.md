---
doc_id: ENT-CHARGE_SCHEDULE
title: Entity — Charge Schedule
generated: true
source_model: _model/capabilities/lease_management.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Charge Schedule

*This document is generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

**Capability/module:** `lease_management` · **Owner scope:** `tenant`

The generated series of periodic charges a lease produces, with the basis of each and its escalation history.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `lease_id` | uuid | yes | no | — | no | no |  |
| `charge_kind` | enum | yes | no | — | no | no |  |
| `period_start` | date | yes | no | — | no | no |  |
| `period_end` | date | yes | no | — | no | no |  |
| `due_on` | date | yes | no | — | no | no |  |
| `amount_minor` | money_minor | yes | no | — | no | yes |  |
| `basis_note` | text | yes | no | — | no | no | how the amount was arrived at, in words - the base amount, the escalation applied, the area and rate, the apportionment. Mandatory, because a charge a counterparty cannot check is a charge they will query and finance will then reconstruct by hand |
| `escalation_applied_id` | uuid | no | no | — | no | no |  |
| `rent_free` | bool | yes | no | — | no | no |  |
| `apportioned` | bool | yes | no | — | no | no | whether the period is partial and the amount pro-rated |
| `billable_outcome_ref` | uuid | no | no | — | no | no | the outcome emitted to billing, so a schedule row and an invoice line can be reconciled |
| `superseded_by_schedule_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `projected`, `raised`, `invoiced`, `superseded`, `cancelled`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `projected` | GAP | GAP | GAP | entity-specific, see capability model |
| `raised` | GAP | GAP | GAP | entity-specific, see capability model |
| `invoiced` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. period_end is on or after period_start, and due_on is consistent with payment_in_advance - at or before period_start when in advance, at or after period_end when in arrears.
2. basis_note is mandatory and non-empty on every row including unescalated ones.
3. A raised charge is never edited. A correction supersedes it with a new row and, where it has already been invoiced, produces a credit through the billing capability rather than altering the schedule.
4. A schedule row emits at most one billable outcome. The uniqueness is enforced by the billing capability's own constraint and is restated here because a duplicated rent charge is discovered by the counterparty.
5. Regenerating a schedule after a lease change affects only rows not yet raised. Rows already raised are superseded explicitly where they must change.

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

- Permission matrix: `14-PERMISSIONS/lease_management/charge_schedule.md`
- Screen specifications: `11-UX/screens/lease_management/charge_schedule/`
- Test catalogue: `20-TESTING/lease_management/charge_schedule/`
