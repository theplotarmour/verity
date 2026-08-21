---
doc_id: ENT-PREPARATION_STEP
title: Entity — Preparation Step
generated: true
source_model: _model/capabilities/kitchen_flow.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Preparation Step

*This document is generated. Edit `_model/capabilities/kitchen_flow.yaml`, not this file.*

**Capability/module:** `kitchen_flow` · **Owner scope:** `tenant`

One station's part of one ticket, with its own timer, its own state and its own person.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `ticket_id` | uuid | yes | no | — | no | no |  |
| `station_id` | uuid | yes | no | — | no | no |  |
| `line_refs` | json | yes | no | — | no | no | flat list of source line references this step covers |
| `display_summary` | string | yes | no | — | no | no | the frozen text shown on the station display. Frozen because resolving item names live means a station screen that changes while somebody is reading it |
| `quantity_summary` | string | yes | no | — | no | no |  |
| `step_notes` | text | no | no | — | no | no |  |
| `expected_seconds` | int | no | no | — | no | no |  |
| `started_at` | timestamptz | no | no | — | no | no |  |
| `completed_at` | timestamptz | no | no | — | no | no |  |
| `elapsed_seconds` | int | no | no | — | no | no |  |
| `started_by_principal_id` | uuid | no | no | — | no | no |  |
| `completed_by_principal_id` | uuid | no | no | — | no | no |  |
| `bumped_forward_from_step_id` | uuid | no | no | — | no | no | for chained stations where work passes onward |
| `sequence_position` | int | yes | no | — | no | no |  |
| `hold_reason` | text | no | no | — | no | no |  |
| `device_ref` | uuid | no | no | — | no | no | which display the action was taken on, resolved through the principal_directory port |

## 2. Lifecycle

States: `queued`, `in_progress`, `held`, `complete`, `cancelled`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `queued` | GAP | GAP | GAP | entity-specific, see capability model |
| `in_progress` | GAP | GAP | GAP | entity-specific, see capability model |
| `held` | GAP | GAP | GAP | entity-specific, see capability model |
| `complete` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. completed_at requires started_at, and completed_at is on or after started_at.
2. elapsed_seconds is derived from the timestamps and is never written directly, so a device with a wrong clock cannot inflate or deflate it.
3. display_summary and quantity_summary are frozen at creation. A station display whose text changes while somebody is reading it is a station display nobody trusts.
4. A step in a chained station may not start before its predecessor completes, and the guard is on the step rather than on the display, because a display can be bypassed and a constraint cannot.
5. step_notes always carries the ticket notes as well as any line-specific ones. A note the person at the station cannot see is a note that does not exist.

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

- Permission matrix: `14-PERMISSIONS/kitchen_flow/preparation_step.md`
- Screen specifications: `11-UX/screens/kitchen_flow/preparation_step/`
- Test catalogue: `20-TESTING/kitchen_flow/preparation_step/`
