---
doc_id: ENT-WAITLIST_ENTRY
title: Entity — Waitlist Entry
generated: true
source_model: _model/capabilities/booking.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Waitlist Entry

*This document is generated. Edit `_model/capabilities/booking.yaml`, not this file.*

**Capability/module:** `booking` · **Owner scope:** `tenant`

Somebody who wants a slot that is not available, with what they will accept and how long they will wait for it.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `party_ref` | uuid | no | no | — | no | no | resolved through the party_directory port |
| `contact_channel_ref` | uuid | yes | no | — | no | no |  |
| `location_ref` | uuid | no | no | — | no | no |  |
| `offering_ref` | uuid | no | no | — | no | no |  |
| `earliest_acceptable_at` | timestamptz | yes | no | — | no | no |  |
| `latest_acceptable_at` | timestamptz | yes | no | — | no | no |  |
| `acceptable_weekdays` | json | no | no | — | no | no | flat list of scalars |
| `party_size` | int | yes | no | — | no | no |  |
| `priority_rank` | int | yes | no | — | no | no | position in the queue. Explicit rather than derived from creation order, so that a legitimate reordering is a recorded act rather than an invisible one |
| `offered_booking_id` | uuid | no | no | — | no | no |  |
| `offer_expires_at` | timestamptz | no | no | — | no | no |  |
| `offers_declined` | int | yes | no | — | no | no |  |
| `expires_at` | timestamptz | yes | no | — | no | no | when the entry lapses. Mandatory, because a waiting list with no expiry becomes a list of people who no longer want anything and the conversion rate collapses |

## 2. Lifecycle

States: `waiting`, `offered`, `converted`, `declined_out`, `expired`, `withdrawn`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `waiting` | GAP | GAP | GAP | entity-specific, see capability model |
| `offered` | GAP | GAP | GAP | entity-specific, see capability model |
| `converted` | GAP | GAP | GAP | entity-specific, see capability model |
| `declined_out` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |
| `withdrawn` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. latest_acceptable_at > earliest_acceptable_at.
2. expires_at is mandatory and may not be later than latest_acceptable_at. Waiting for a slot after the last acceptable time is not waiting.
3. An entry may hold at most one live offer. Offering two slots to one person and having them accept both is a double booking created by the waiting list itself.
4. priority_rank changes are audited with a reason. An unexplained reordering of a queue is the single fastest way to lose trust in a waiting list.

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

- Permission matrix: `14-PERMISSIONS/booking/waitlist_entry.md`
- Screen specifications: `11-UX/screens/booking/waitlist_entry/`
- Test catalogue: `20-TESTING/booking/waitlist_entry/`
