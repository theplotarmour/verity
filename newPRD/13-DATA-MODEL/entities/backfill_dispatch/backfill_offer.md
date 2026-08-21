---
doc_id: ENT-BACKFILL_OFFER
title: Entity — Backfill Offer
generated: true
source_model: _model/capabilities/backfill_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Backfill Offer

*This document is generated. Edit `_model/capabilities/backfill_dispatch.yaml`, not this file.*

**Capability/module:** `backfill_dispatch` · **Owner scope:** `tenant`

One approach to one candidate, with what was offered, when it expires and what came back.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `request_id` | uuid | yes | no | — | no | no |  |
| `candidate_resource_ref` | uuid | yes | no | — | no | no | resolved through the schedulable_resource port |
| `tier` | int | yes | no | — | no | no |  |
| `rank` | int | yes | no | — | no | no |  |
| `rank_factors` | json | yes | no | — | no | no | flat set of scalars naming why this candidate ranked here - distance, qualification match, hours headroom, recent decline rate, cost. Mandatory, because an unexplainable ranking gets overridden until it is switched off |
| `premium_percent` | int | yes | no | — | no | yes |  |
| `sent_at` | timestamptz | yes | no | — | no | no |  |
| `channel` | enum | yes | no | — | no | no | spoken_by_dispatcher exists because the telephone is the fastest channel and pretending otherwise would leave the fastest path unrecorded |
| `expires_at` | timestamptz | yes | no | — | no | no |  |
| `responded_at` | timestamptz | no | no | — | no | no |  |
| `response` | enum | yes | no | — | no | no |  |
| `decline_reason` | enum | no | no | — | no | no | a closed set so decline reasons are analysable. not_stated is present and is expected to dominate, and pretending otherwise would make the analysis dishonest |
| `delivery_confirmed_at` | timestamptz | no | no | — | no | no | whether the offer actually reached the candidate. An offer that was never delivered and an offer that was ignored are different facts and only one of them is about the candidate |

## 2. Lifecycle

States: `pending`, `accepted`, `declined`, `expired`, `withdrawn`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `pending` | GAP | GAP | GAP | entity-specific, see capability model |
| `accepted` | GAP | GAP | GAP | entity-specific, see capability model |
| `declined` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |
| `withdrawn` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. expires_at > sent_at, and expires_at may never be later than the request's window_start. An offer that expires after the commitment begins is theatre.
2. rank_factors is mandatory and non-empty.
3. An offer may not be sent to a candidate whom the resource provider reports unavailable for the window, except through the explicit override path.
4. A candidate is never held or reserved by an outstanding offer. Reserving them removes them from other offers and, with a decline rate above half, reserving is how one absence becomes two uncovered commitments.
5. premium_percent is gated by view_financial on read, and is shown to the candidate in the offer regardless, because an offer that hides its own terms is not an offer.

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

- Permission matrix: `14-PERMISSIONS/backfill_dispatch/backfill_offer.md`
- Screen specifications: `11-UX/screens/backfill_dispatch/backfill_offer/`
- Test catalogue: `20-TESTING/backfill_dispatch/backfill_offer/`
