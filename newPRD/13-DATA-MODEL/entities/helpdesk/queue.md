---
doc_id: ENT-QUEUE
title: Entity — Queue
generated: true
source_model: _model/capabilities/helpdesk.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Queue

*This document is generated. Edit `_model/capabilities/helpdesk.yaml`, not this file.*

**Capability/module:** `helpdesk` · **Owner scope:** `tenant`

A named destination for tickets, with who watches it, what it accepts and what happens when nobody is watching.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | tenant | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `is_default` | bool | yes | no | — | no | no | exactly one queue per tenant is the default, and it is where anything unroutable lands rather than nowhere |
| `watcher_role_keys` | json | yes | no | — | no | no | flat list of role keys whose holders see this queue. Roles rather than people, per kernel K10 - a queue watched by a named person dies when that person leaves |
| `accepts_categories` | json | no | no | — | no | no | flat list of category keys. Null means anything |
| `accepts_locations` | json | no | no | — | no | no |  |
| `business_hours_calendar_ref` | uuid | no | no | — | no | no | the calendar response targets are measured against for this queue, resolved through the location_calendar port |
| `fallback_queue_id` | uuid | no | no | — | no | no | where tickets go when nobody here responds within the queue's own threshold |
| `auto_assign_strategy` | enum | yes | no | — | no | no | none is the default deliberately. Automatic assignment to somebody who is unavailable is worse than a visible unassigned queue |

## 2. Lifecycle

States: `active`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Exactly one queue per tenant has is_default true, enforced at write. A tenant with no default queue silently drops anything unroutable, and a tenant with two has a routing outcome nobody can predict.
2. watcher_role_keys may not be empty. A queue nobody watches is a place tickets go to be forgotten, and the emptiness is detectable at configuration time rather than at 3am.
3. fallback_queue_id may not create a cycle among queues, checked at write.
4. A queue may not be deleted while any non-terminal ticket references it. It is retired, and its tickets are moved explicitly.

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

- Permission matrix: `14-PERMISSIONS/helpdesk/queue.md`
- Screen specifications: `11-UX/screens/helpdesk/queue/`
- Test catalogue: `20-TESTING/helpdesk/queue/`
