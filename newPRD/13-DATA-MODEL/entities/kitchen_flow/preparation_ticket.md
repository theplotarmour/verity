---
doc_id: ENT-PREPARATION_TICKET
title: Entity — Preparation Ticket
generated: true
source_model: _model/capabilities/kitchen_flow.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Preparation Ticket

*This document is generated. Edit `_model/capabilities/kitchen_flow.yaml`, not this file.*

**Capability/module:** `kitchen_flow` · **Owner scope:** `tenant`

One request's worth of preparation work, spanning every station involved, with its coordination target and its overall progress.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `location_ref` | uuid | yes | no | — | no | no |  |
| `source_ref` | uuid | yes | no | — | no | no | the request this prepares, resolved through the fulfilment_route port. Opaque here - this capability never learns what kind of request it is |
| `source_capability_key` | string | yes | no | — | no | no |  |
| `display_reference` | string | yes | no | — | no | no | the short code on the screen and called out. Deliberately short and deliberately not the source reference, because a long identifier read aloud across a noisy room is misheard |
| `sequence_number` | int | yes | no | — | no | no | monotonic per location per operating day. This is what people actually use to order work, and it must be stable and gapless within a day even when tickets are recalled |
| `received_at` | timestamptz | yes | yes | — | no | no |  |
| `target_ready_at` | timestamptz | no | no | — | no | no | when everything should be finished together. The coordination target, from the source request's promise |
| `coordination_mode` | enum | yes | no | — | no | no | whether the parts must finish together, may leave as they finish, or leave in declared stages. This single field is the difference between a coordinated operation and a shouted one |
| `priority` | enum | yes | no | — | no | no |  |
| `expedited_by_principal_id` | uuid | no | no | — | no | no |  |
| `expedited_reason` | text | no | no | — | no | no |  |
| `ready_at` | timestamptz | no | no | — | no | no |  |
| `collected_at` | timestamptz | no | no | — | no | no |  |
| `recall_of_ticket_id` | uuid | no | no | — | no | no |  |
| `recall_count` | int | yes | no | — | no | no |  |
| `notes` | text | no | no | — | no | no | instructions that must reach every station, shown on every step rather than only on the ticket header |
| `created_offline` | bool | yes | no | — | no | no |  |
| `sync_lag_seconds` | int | no | no | — | no | no |  |

## 2. Lifecycle

States: `received`, `unrouted`, `in_preparation`, `partially_ready`, `ready`, `collected`, `recalled`, `cancelled`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `received` | GAP | GAP | GAP | entity-specific, see capability model |
| `unrouted` | GAP | GAP | GAP | entity-specific, see capability model |
| `in_preparation` | GAP | GAP | GAP | entity-specific, see capability model |
| `partially_ready` | GAP | GAP | GAP | entity-specific, see capability model |
| `ready` | GAP | GAP | GAP | entity-specific, see capability model |
| `collected` | GAP | GAP | GAP | entity-specific, see capability model |
| `recalled` | GAP | GAP | GAP | entity-specific, see capability model |
| `cancelled` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. sequence_number is unique per location per operating day and is allocated from a device-local range when offline, so two devices cannot mint the same number. The range allocation is what makes offline sequence numbers safe and it is stated because the obvious implementation collides on the first busy offline period.
2. A ticket with no steps may not leave received. An empty ticket is a display line nobody can act on.
3. ready_at is set only when every step required by the coordination mode has completed. It is derived and never written directly.
4. recall_of_ticket_id and origin recall are set together, and the original's recall_count is incremented in the same transaction.
5. notes propagate to every step. A note held only on the ticket header is a note the person at the station does not see.

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

- Permission matrix: `14-PERMISSIONS/kitchen_flow/preparation_ticket.md`
- Screen specifications: `11-UX/screens/kitchen_flow/preparation_ticket/`
- Test catalogue: `20-TESTING/kitchen_flow/preparation_ticket/`
