---
doc_id: ENT-NOTIFICATION_BATCH
title: Entity — Batch
generated: true
source_model: _model/capabilities/notification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Batch

*This document is generated. Edit `_model/capabilities/notification.yaml`, not this file.*

**Capability/module:** `notification` · **Owner scope:** `tenant`

A group of messages collapsed into one send for one recipient, which is how a bulk event stops being forty messages.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `recipient_principal_id` | uuid | no | no | — | no | no |  |
| `recipient_party_ref` | uuid | no | no | — | no | no |  |
| `category_key` | string | yes | no | — | no | no |  |
| `channel` | enum | yes | no | — | no | no |  |
| `window_start` | timestamptz | yes | no | — | no | no |  |
| `window_end` | timestamptz | yes | no | — | no | no |  |
| `message_count` | int | yes | no | — | no | no |  |
| `dispatched_message_id` | uuid | no | no | — | no | no |  |
| `max_priority_in_batch` | enum | yes | no | — | no | no | a batch containing a high-priority item is dispatched immediately rather than at the end of its window, because batching an urgent message is how it arrives too late to matter |

## 2. Lifecycle

States: `accumulating`, `dispatched`, `abandoned`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `accumulating` | GAP | GAP | GAP | entity-specific, see capability model |
| `dispatched` | GAP | GAP | GAP | entity-specific, see capability model |
| `abandoned` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A batch containing any message of priority high or critical, or any mandatory_class other than none, dispatches immediately and the remaining window is abandoned.
2. message_count is derived from its members and is never written directly.
3. A batch dispatches exactly one message. If dispatch fails, the batch does not silently dissolve into individual sends - it retries as a batch, because dissolving would produce the flood the batch existed to prevent.

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

- Permission matrix: `14-PERMISSIONS/notification/notification_batch.md`
- Screen specifications: `11-UX/screens/notification/notification_batch/`
- Test catalogue: `20-TESTING/notification/notification_batch/`
