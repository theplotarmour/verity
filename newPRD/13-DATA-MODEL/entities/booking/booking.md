---
doc_id: ENT-BOOKING
title: Entity — Booking
generated: true
source_model: _model/capabilities/booking.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Booking

*This document is generated. Edit `_model/capabilities/booking.yaml`, not this file.*

**Capability/module:** `booking` · **Owner scope:** `tenant`

One reserved slot against a resource for a subject, with who booked it, who it is for, and its commercial terms.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `reference` | string | yes | yes | tenant | no | no | the short code the person quotes when they telephone |
| `booked_by_party_ref` | uuid | no | no | — | no | no | who made the booking, resolved through the party_directory port. Null for an anonymous consumer booking that has not yet been resolved to a party |
| `subject_party_ref` | uuid | no | no | — | no | no | who the booking is FOR, which is frequently not who made it. Separate field, because the reminder must reach the person who turns up and the receipt must reach the person who pays |
| `contact_channel_ref` | uuid | no | no | — | no | no | which channel to use, resolved through the party_directory port with consent honoured |
| `location_ref` | uuid | no | no | — | no | no | resolved through the org_structure port |
| `offering_ref` | uuid | no | no | — | no | no | what is being booked, resolved through the bookable_offering port. Opaque - this capability never learns what kind of thing it is |
| `requested_resource_ref` | uuid | no | no | — | no | no | a specific resource the person asked for, resolved through the schedulable_resource port. Null means any suitable resource |
| `starts_at` | timestamptz | yes | no | — | no | no |  |
| `ends_at` | timestamptz | yes | no | — | no | no |  |
| `party_size` | int | yes | no | — | no | no | how many the booking is for. A generic count; what is being counted belongs to the pack |
| `channel` | enum | yes | no | — | no | no | walk_in exists because a booking created at the moment of arrival is still a booking and excluding it makes every utilisation figure wrong |
| `deposit_required_minor` | money_minor | no | no | — | no | yes |  |
| `deposit_paid_minor` | money_minor | no | no | — | no | yes |  |
| `deposit_reference` | string | no | no | — | no | yes | the payment reference from the integrations capability. This capability never holds a payment credential |
| `cancellation_policy_id` | uuid | no | no | — | no | no |  |
| `cancellation_deadline_at` | timestamptz | no | no | — | no | no | computed from the policy at confirmation and then frozen, because a person is told this date and it must not move |
| `notes` | text | no | no | — | no | no |  |
| `access_requirements` | text | no | no | — | yes | no | anything the person needs in order to attend. Sensitive by default because it frequently discloses a health or personal circumstance, and it must still reach the person delivering the service |
| `source_waitlist_id` | uuid | no | no | — | no | no |  |
| `rescheduled_from_booking_id` | uuid | no | no | — | no | no |  |
| `reschedule_count` | int | yes | no | — | no | no |  |
| `no_show_recorded_at` | timestamptz | no | no | — | no | no |  |
| `arrived_at` | timestamptz | no | no | — | no | no |  |

## 2. Lifecycle

States: `held`, `pending_confirmation`, `confirmed`, `reminded`, `arrived`, `in_service`, `completed`, `cancelled`, `no_show`, `expired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `held` | GAP | GAP | GAP | entity-specific, see capability model |
| `pending_confirmation` | GAP | GAP | GAP | entity-specific, see capability model |
| `confirmed` | GAP | GAP | GAP | entity-specific, see capability model |
| `reminded` | GAP | GAP | GAP | entity-specific, see capability model |
| `arrived` | GAP | GAP | GAP | entity-specific, see capability model |
| `in_service` | GAP | GAP | GAP | entity-specific, see capability model |
| `completed` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |
| `no_show` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. ends_at > starts_at.
2. At least one of booked_by_party_ref and contact_channel_ref must be present at confirmation. A confirmed booking nobody can be reached about is a slot that will be held for somebody who never appears.
3. deposit_paid_minor may never exceed deposit_required_minor. An overpayment is a payment record, not a booking field.
4. Financial fields are gated by view_financial and are never offline_editable.
5. cancellation_deadline_at is frozen at confirmation. Recomputing it when a policy changes would move a deadline a person has already been told.
6. access_requirements is gated by view_sensitive on read AND is always available to the assigned resource at the time of service, because withholding it from the person delivering the service defeats its purpose.

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

- Permission matrix: `14-PERMISSIONS/booking/booking.md`
- Screen specifications: `11-UX/screens/booking/booking/`
- Test catalogue: `20-TESTING/booking/booking/`
