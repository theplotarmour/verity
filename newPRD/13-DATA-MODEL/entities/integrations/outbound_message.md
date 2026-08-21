---
doc_id: ENT-OUTBOUND_MESSAGE
title: Entity — Outbound Message
generated: true
source_model: _model/capabilities/integrations.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Outbound Message

*This document is generated. Edit `_model/capabilities/integrations.yaml`, not this file.*

**Capability/module:** `integrations` · **Owner scope:** `tenant`

One event Verity is sending somewhere else, with its delivery attempts, its stable identifier and what the far side said.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no | the stable identifier carried on every retry, so the receiver can deduplicate. It never changes, which is the property the whole delivery contract rests on |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `connection_id` | uuid | yes | no | — | no | no |  |
| `event_type` | string | yes | yes | — | no | no |  |
| `event_version` | int | yes | yes | — | no | no |  |
| `source_capability_key` | string | yes | yes | — | no | no |  |
| `source_event_id` | uuid | yes | yes | — | no | no | the platform event that produced it, so a delivery can be traced back to what happened |
| `payload` | json | yes | yes | — | no | no | redacted per the subscriber's permitted field set at composition time, not at delivery. The redaction is part of the payload rather than applied on the way out, so what was sent is exactly what is stored |
| `payload_hash` | string | yes | yes | — | no | no |  |
| `created_at` | timestamptz | yes | yes | — | no | no |  |
| `next_attempt_at` | timestamptz | no | no | — | no | no |  |
| `attempt_count` | int | yes | no | — | no | no |  |
| `last_status_code` | int | no | no | — | no | no |  |
| `last_response_excerpt` | text | no | no | — | no | no | a bounded excerpt of what the far side said, retained because it is what a person needs to diagnose and because a full body may contain anything |
| `delivered_at` | timestamptz | no | no | — | no | no |  |
| `dead_lettered_at` | timestamptz | no | no | — | no | no |  |
| `dead_letter_reason` | text | no | no | — | no | no |  |
| `replayed_from_message_id` | uuid | no | no | — | no | no |  |

## 2. Lifecycle

States: `pending`, `in_flight`, `delivered`, `retrying`, `dead_lettered`, `abandoned`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `pending` | GAP | GAP | GAP | entity-specific, see capability model |
| `in_flight` | GAP | GAP | GAP | entity-specific, see capability model |
| `delivered` | GAP | GAP | GAP | entity-specific, see capability model |
| `retrying` | GAP | GAP | GAP | entity-specific, see capability model |
| `dead_lettered` | GAP | GAP | GAP | entity-specific, see capability model |
| `abandoned` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. id is stable across every attempt and is sent on every one, so a receiver can deduplicate. Minting a new identifier per attempt is the defect that makes at-least-once delivery unusable for the receiver.
2. payload is composed once, redacted to the subscriber's permitted field set, and frozen. Redacting at delivery time would mean the stored record differs from what was sent, and the stored record is what a dispute reads.
3. A message is never deleted. It is delivered, dead-lettered or explicitly abandoned with a reason.
4. Retry scheduling is exponential with jitter and bounded by the connection's retry budget. Synchronised retries across a tenant's messages are how a recovering remote system is knocked over again.
5. An exhausted budget produces a dead letter, never a discard. This is the deliberate departure from the practice cited in evidence_basis, because a discarded billable outcome is revenue that disappears quietly.

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

- Permission matrix: `14-PERMISSIONS/integrations/outbound_message.md`
- Screen specifications: `11-UX/screens/integrations/outbound_message/`
- Test catalogue: `20-TESTING/integrations/outbound_message/`
