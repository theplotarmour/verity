---
doc_id: ENT-WORKFORCE_MEMBER
title: Entity — Workforce Member
generated: true
source_model: _model/capabilities/people.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Workforce Member

*This document is generated. Edit `_model/capabilities/people.yaml`, not this file.*

**Capability/module:** `people` · **Owner scope:** `tenant`

One person's engagement with the tenant - the operational record, not the identity record.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `party_ref` | uuid | yes | no | — | no | no | the person, resolved through the party_directory port. Deliberately not a foreign key - party is another capability and kernel K04 forbids a concrete cross-capability reference |
| `member_code` | string | yes | no | tenant | no | no | the short identifier used on rosters, on reports and out loud |
| `engagement_kind` | enum | yes | no | — | no | no | shapes, not labels. Which shape a tenant calls what is a terminology map concern |
| `supplying_party_ref` | uuid | no | no | — | no | no | required when engagement_kind is supplied_by_third_party, resolved through the party_directory port |
| `primary_location_ref` | uuid | no | no | — | no | no | resolved through the org_structure port; drives the site partition and the default scope of who can see this record |
| `engaged_from` | date | yes | no | — | no | no |  |
| `engaged_to` | date | no | no | — | no | no |  |
| `notice_period_days` | int | no | no | — | no | no |  |
| `cost_rate_minor` | money_minor | no | no | — | no | yes | the cost to the tenant per unit of the rate basis. Gated by view_financial and never offline_editable |
| `cost_rate_basis` | enum | no | no | — | no | yes |  |
| `max_hours_per_day` | decimal | no | no | — | no | no |  |
| `max_hours_per_week` | decimal | no | no | — | no | no |  |
| `min_rest_hours_between_assignments` | decimal | no | no | — | no | no |  |
| `max_consecutive_days` | int | no | no | — | no | no |  |
| `availability_pattern` | json | no | no | — | no | no | a flat weekly pattern of scalars, per the object-valued prohibition. Exceptions live on absence records rather than being nested here |
| `emergency_contact_ref` | uuid | no | no | — | yes | no | another party resolved through the party_directory port |
| `bank_reference_ref` | string | no | no | — | yes | yes | a reference to a stored payment instrument held by the integrations capability, never the account number. This capability must never hold a payment credential |
| `exit_reason` | text | no | no | — | no | no |  |
| `rehire_eligible` | enum | yes | no | — | no | no |  |

## 2. Lifecycle

States: `onboarding`, `active`, `on_leave`, `suspended`, `notice`, `ended`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `onboarding` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `on_leave` | GAP | GAP | GAP | entity-specific, see capability model |
| `suspended` | GAP | GAP | GAP | entity-specific, see capability model |
| `notice` | GAP | GAP | GAP | entity-specific, see capability model |
| `ended` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. unique(tenant_id, party_ref) among non-ended members. One person has one engagement at a time with one tenant. A person genuinely holding two concurrent engagement kinds is two members with a recorded relationship, so that hours limits can be evaluated across both rather than separately.
2. engaged_to, where set, must be on or after engaged_from.
3. supplying_party_ref is non-null exactly when engagement_kind is supplied_by_third_party.
4. Financial fields are gated by view_financial and are never offline_editable, per the kernel rule. A cost rate edited on a device that has been offline for two days is a rate set against stale information and it flows straight into billing.
5. A member may not be assigned work while in any state other than active. This is one condition, evaluated in one place, so that the reason a person is unassignable is always singular and legible.

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

- Permission matrix: `14-PERMISSIONS/people/workforce_member.md`
- Screen specifications: `11-UX/screens/people/workforce_member/`
- Test catalogue: `20-TESTING/people/workforce_member/`
