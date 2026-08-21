---
doc_id: ENT-TICKET
title: Entity — Ticket
generated: true
source_model: _model/capabilities/helpdesk.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Ticket

*This document is generated. Edit `_model/capabilities/helpdesk.yaml`, not this file.*

**Capability/module:** `helpdesk` · **Owner scope:** `tenant`

One reported matter, with who reported it, what it is about, who is dealing with it and how it ended.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `reference` | string | yes | yes | tenant | no | no | the short code quoted on the telephone |
| `subject` | string | yes | no | — | no | no |  |
| `body` | text | no | no | — | no | no |  |
| `reporter_party_ref` | uuid | no | no | — | no | no | resolved through the party_directory port. Null for an anonymous or unidentified report, which must remain acceptable |
| `reporter_contact_raw` | string | no | no | — | yes | no | the address or number the report arrived from, kept verbatim even where a party was matched, because the match may be wrong and the reply has to go back where it came from |
| `channel` | enum | yes | no | — | no | no |  |
| `location_ref` | uuid | no | no | — | no | no |  |
| `subject_ref` | uuid | no | no | — | no | no | what it is about, resolved through the work_subject port. Opaque here |
| `category_id` | uuid | no | no | — | no | no |  |
| `priority` | enum | yes | no | — | no | no |  |
| `priority_source` | enum | yes | no | — | no | no | where the priority came from. A reporter-stated urgency and a rule-derived one are different facts and treating them identically means every ticket is urgent |
| `queue_id` | uuid | no | no | — | no | no |  |
| `assignee_principal_id` | uuid | no | no | — | no | no |  |
| `routing_explanation` | text | no | no | — | no | no | why it landed where it did. Mandatory where routing was automatic, because a queue nobody can see the reason for is a queue they will bypass |
| `first_response_at` | timestamptz | no | no | — | no | no |  |
| `resolved_at` | timestamptz | no | no | — | no | no |  |
| `closed_at` | timestamptz | no | no | — | no | no |  |
| `resolution_kind` | enum | no | no | — | no | no | deliberately includes the honest endings. A system offering only resolved records resolved for everything, including the ones nobody could reproduce |
| `resolution_note` | text | no | no | — | no | no |  |
| `converted_work_refs` | json | no | no | — | no | no | flat list of work references raised from this ticket through the work_generation port |
| `merged_into_ticket_id` | uuid | no | no | — | no | no |  |
| `reopen_of_ticket_id` | uuid | no | no | — | no | no |  |
| `reopen_count` | int | yes | no | — | no | no |  |
| `satisfaction_score` | int | no | no | — | no | no |  |
| `last_reporter_contact_at` | timestamptz | no | no | — | no | no | used by the awaiting-reporter policy, which is the largest source of tickets that never end |

## 2. Lifecycle

States: `new`, `triaged`, `awaiting_assignee`, `awaiting_reporter`, `awaiting_third_party`, `resolved`, `closed`, `merged`, `reopened`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `new` | GAP | GAP | GAP | entity-specific, see capability model |
| `triaged` | GAP | GAP | GAP | entity-specific, see capability model |
| `awaiting_assignee` | GAP | GAP | GAP | entity-specific, see capability model |
| `awaiting_reporter` | GAP | GAP | GAP | entity-specific, see capability model |
| `awaiting_third_party` | GAP | GAP | GAP | entity-specific, see capability model |
| `resolved` | GAP | GAP | GAP | entity-specific, see capability model |
| `closed` | GAP | GAP | GAP | entity-specific, see capability model |
| `merged` | GAP | GAP | GAP | entity-specific, see capability model |
| `reopened` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. resolved_at requires resolution_kind to be set and not not_recorded. A resolution with no kind records only that somebody pressed a button.
2. routing_explanation is mandatory whenever queue_id or assignee was set by a rule rather than by a person.
3. merged_into_ticket_id is set exactly in state merged, and a merged ticket never carries its own response-time measurements forward, because counting one matter twice inflates every figure.
4. reporter_contact_raw is retained verbatim even where a party matched, and is gated by view_sensitive.
5. A ticket may reference several converted work items and owns none of them. Closing a ticket never closes work, and completing work never closes a ticket.

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

- Permission matrix: `14-PERMISSIONS/helpdesk/ticket.md`
- Screen specifications: `11-UX/screens/helpdesk/ticket/`
- Test catalogue: `20-TESTING/helpdesk/ticket/`
