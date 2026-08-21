---
doc_id: ENT-LEASE
title: Entity — Lease
generated: true
source_model: _model/capabilities/lease_management.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Lease

*This document is generated. Edit `_model/capabilities/lease_management.yaml`, not this file.*

**Capability/module:** `lease_management` · **Owner scope:** `tenant`

One agreement with one counterparty to occupy defined space for a period, with its commercial terms and its lifecycle.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `reference` | string | yes | yes | tenant | no | no |  |
| `counterparty_ref` | uuid | yes | no | — | no | no | resolved through the party_directory port |
| `space_refs` | json | yes | no | — | no | no | flat list of occupied space references, resolved through the occupiable_space port. Opaque here - this capability never learns what kind of space it is |
| `measured_area` | decimal | no | no | — | no | no |  |
| `area_unit` | string | no | no | — | no | no |  |
| `area_basis` | enum | yes | no | — | no | no | which measurement the rent is calculated on. Different bases give materially different numbers for the same space and an unstated basis is the origin of most rent disputes |
| `starts_on` | date | yes | no | — | no | no |  |
| `ends_on` | date | yes | no | — | no | no |  |
| `break_dates` | json | no | no | — | no | no | flat list of dates on which either party may end the agreement early |
| `notice_days` | int | no | no | — | no | no |  |
| `renewal_option` | enum | yes | no | — | no | no |  |
| `renewal_window_opens_on` | date | no | no | — | no | no |  |
| `renewal_window_closes_on` | date | no | no | — | no | no |  |
| `base_amount_minor` | money_minor | yes | no | — | no | yes |  |
| `currency` | string | yes | no | — | no | yes |  |
| `payment_frequency` | enum | yes | no | — | no | yes |  |
| `payment_in_advance` | bool | yes | no | — | no | yes | whether a period is paid at its start or its end. Explicit because it moves every due date by a whole period and is a frequent source of disagreement |
| `deposit_amount_minor` | money_minor | no | no | — | no | yes |  |
| `rent_free_periods` | json | no | no | — | no | no | flat list of period start and end pairs |
| `document_ref` | string | no | no | — | no | no | the executed agreement through the evidence_capture port |
| `supersedes_lease_id` | uuid | no | no | — | no | no |  |
| `ended_reason` | enum | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `agreed`, `active`, `in_notice`, `holding_over`, `ended`, `terminated`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `agreed` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `in_notice` | GAP | GAP | GAP | entity-specific, see capability model |
| `holding_over` | GAP | GAP | GAP | entity-specific, see capability model |
| `ended` | GAP | GAP | GAP | entity-specific, see capability model |
| `terminated` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. ends_on is after starts_on, and every break date and renewal window date falls within the term.
2. space_refs may not be empty. An agreement to occupy nothing is not a lease.
3. Two active leases may not claim the same space over overlapping dates. The overlap is detected at activation and refused, because double-letting is discovered by two counterparties arriving at the same place.
4. Financial fields are gated by view_financial and are never offline_editable.
5. area_basis is required before any charge is calculated per unit of area. A per-area charge computed on an unstated basis is a number neither party can check.
6. renewal_option=automatic_unless_notice requires both renewal window dates and a notice period. An automatic renewal with no window is a commitment nobody can escape.

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

- Permission matrix: `14-PERMISSIONS/lease_management/lease.md`
- Screen specifications: `11-UX/screens/lease_management/lease/`
- Test catalogue: `20-TESTING/lease_management/lease/`
