---
doc_id: ENT-BACKFILL_REQUEST
title: Entity — Backfill Request
generated: true
source_model: _model/capabilities/backfill_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Backfill Request

*This document is generated. Edit `_model/capabilities/backfill_dispatch.yaml`, not this file.*

**Capability/module:** `backfill_dispatch` · **Owner scope:** `tenant`

An open need for cover on a specific commitment, with its deadline, its escalation position and its outcome.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `commitment_ref` | uuid | yes | no | — | no | no | the commitment that lost cover, resolved through the schedulable_demand port |
| `location_ref` | uuid | no | no | — | no | no | resolved through the org_structure port |
| `absent_resource_ref` | uuid | no | no | — | no | no | who was covering it, resolved through the schedulable_resource port. Null where the commitment was never covered |
| `cause` | enum | yes | no | — | no | no | cause drives the default billing classification, and unknown is deliberately present because a commitment can lose cover without anyone knowing why yet |
| `window_start` | timestamptz | yes | no | — | no | no |  |
| `window_end` | timestamptz | yes | no | — | no | no |  |
| `required_qualification_keys` | json | yes | no | — | no | no | flat list of scalars, carried from the demand |
| `required_count` | int | yes | no | — | no | no |  |
| `priority` | enum | yes | no | — | no | no |  |
| `lead_minutes_at_raise` | int | yes | no | — | no | no | how much notice existed when the need was detected. Frozen, because it is the number that determines whether the outcome was reasonable and it must not shrink as the clock runs |
| `escalation_tier` | int | yes | no | — | no | no |  |
| `escalation_policy_id` | uuid | yes | no | — | no | no |  |
| `filled_by_resource_ref` | uuid | no | no | — | no | no |  |
| `filled_at` | timestamptz | no | no | — | no | no |  |
| `time_to_fill_seconds` | int | no | no | — | no | no | the operational metric that matters. Reported per location and per cause, because a location that takes four hours to backfill has a staffing problem the roster is hiding |
| `offers_made` | int | yes | no | — | no | no |  |
| `declines_received` | int | yes | no | — | no | no |  |
| `billing_classification` | enum | yes | no | — | no | yes | a classification recorded here and priced elsewhere. The rule that sets it is tenant policy |
| `premium_applied` | bool | yes | no | — | no | yes | whether a short-notice premium was offered to secure the cover |
| `outcome_reason` | text | no | no | — | no | no |  |

## 2. Lifecycle

States: `raised`, `searching`, `offered`, `filled`, `partially_filled`, `escalated`, `unfilled`, `cancelled`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `raised` | GAP | GAP | GAP | entity-specific, see capability model |
| `searching` | GAP | GAP | GAP | entity-specific, see capability model |
| `offered` | GAP | GAP | GAP | entity-specific, see capability model |
| `filled` | GAP | GAP | GAP | entity-specific, see capability model |
| `partially_filled` | GAP | GAP | GAP | entity-specific, see capability model |
| `escalated` | GAP | GAP | GAP | entity-specific, see capability model |
| `unfilled` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. window_end > window_start.
2. lead_minutes_at_raise is immutable after creation. It is the fairness measure for the outcome and a recomputed value would always flatter the result.
3. A request may not be created without an escalation_policy_id. A backfill with no ladder has no defined behaviour after the first offer, and the first offer is declined most of the time.
4. filled_by_resource_ref must differ from absent_resource_ref. Backfilling somebody with themselves is a data error masquerading as a resolution.
5. billing_classification is gated by view_financial. Whether cover was arranged is operational; who pays for it is not.

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

- Permission matrix: `14-PERMISSIONS/backfill_dispatch/backfill_request.md`
- Screen specifications: `11-UX/screens/backfill_dispatch/backfill_request/`
- Test catalogue: `20-TESTING/backfill_dispatch/backfill_request/`
