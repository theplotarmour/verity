---
doc_id: ENT-TICKET_MESSAGE
title: Entity — Ticket Message
generated: true
source_model: _model/capabilities/helpdesk.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Ticket Message

*This document is generated. Edit `_model/capabilities/helpdesk.yaml`, not this file.*

**Capability/module:** `helpdesk` · **Owner scope:** `tenant`

One communication on a ticket, inbound or outbound, internal or visible to the reporter, with what was actually sent.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `ticket_id` | uuid | yes | no | — | no | no |  |
| `direction` | enum | yes | no | — | no | no |  |
| `visibility` | enum | yes | no | — | no | no | MANDATORY with no default. An internal note posted as reporter-visible is the single most damaging mistake available on a helpdesk, and a default makes it a matter of habit rather than of choice |
| `channel` | enum | yes | no | — | no | no |  |
| `body` | text | yes | no | — | no | no |  |
| `author_principal_id` | uuid | no | no | — | no | no |  |
| `author_party_ref` | uuid | no | no | — | no | no |  |
| `sent_at` | timestamptz | yes | no | — | no | no |  |
| `delivery_state` | enum | yes | no | — | no | no |  |
| `attachment_refs` | json | no | no | — | no | no | through the evidence_capture port |
| `counts_as_first_response` | bool | yes | no | — | no | no | computed at write. An automated acknowledgement does NOT count, because a reporter can tell the difference and the metric exists to measure what they experience |
| `redacted_at` | timestamptz | no | no | — | no | no |  |
| `redacted_by_principal_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `drafted`, `sent`, `delivered`, `failed`, `redacted`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `drafted` | GAP | GAP | GAP | entity-specific, see capability model |
| `sent` | GAP | GAP | GAP | entity-specific, see capability model |
| `delivered` | GAP | GAP | GAP | entity-specific, see capability model |
| `failed` | GAP | GAP | GAP | entity-specific, see capability model |
| `redacted` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. visibility is mandatory and has no default at any layer.
2. A message is immutable once sent. Content that must be removed is redacted, which retains the fact of the message and its metadata and replaces the body, because deleting correspondence from a ticket makes the thread unreadable and the deletion undetectable.
3. counts_as_first_response is true only for an outbound, reporter_visible message authored by a principal rather than by the system.
4. An inbound message never changes ticket state by itself except to move awaiting_reporter back to awaiting_assignee. Automatic state changes driven by inbound mail are how an out-of-office reply reopens forty tickets.

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

- Permission matrix: `14-PERMISSIONS/helpdesk/ticket_message.md`
- Screen specifications: `11-UX/screens/helpdesk/ticket_message/`
- Test catalogue: `20-TESTING/helpdesk/ticket_message/`
