---
doc_id: ENT-DEVICE_STORE
title: Entity — Device Store
generated: true
source_model: _model/capabilities/offline_sync.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Device Store

*This document is generated. Edit `_model/capabilities/offline_sync.yaml`, not this file.*

**Capability/module:** `offline_sync` · **Owner scope:** `tenant`

What one device is holding - its dataset scope, its freshness, its queue depth and when the server last heard from it.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `device_ref` | uuid | yes | no | — | no | no | resolved through the principal_directory port |
| `principal_id` | uuid | yes | no | — | no | no | whose queue this is. A shared device holds a separate store per principal, because queued work belongs to the person who did it |
| `scope_expression` | text | yes | no | — | no | no | what this device is entitled to hold, derived from the principal's permission scope at sync time and never wider. A device holding data the principal cannot see is a disclosure that survives a permission change |
| `dataset_version` | string | yes | no | — | no | no | fingerprint of the schema and configuration the local store was built against |
| `last_pull_at` | timestamptz | no | no | — | no | no |  |
| `last_push_at` | timestamptz | no | no | — | no | no |  |
| `last_seen_at` | timestamptz | no | no | — | no | no |  |
| `queued_mutation_count` | int | yes | no | — | no | no | the number the SERVER believes is outstanding, updated on every contact. This is what makes stranded work visible before the device returns |
| `queued_financial_count` | int | yes | no | — | no | no | should always be zero by the kernel rule; a non-zero value is a defect alert rather than an operational one |
| `oldest_queued_at` | timestamptz | no | no | — | no | no |  |
| `storage_used_bytes` | bigint | no | no | — | no | no |  |
| `storage_limit_bytes` | bigint | no | no | — | no | no |  |
| `app_version` | string | no | no | — | no | no |  |
| `min_supported_version_ok` | bool | yes | no | — | no | no |  |
| `wipe_requested_at` | timestamptz | no | no | — | no | no |  |
| `wipe_confirmed_at` | timestamptz | no | no | — | no | no |  |

## 2. Lifecycle

States: `provisioning`, `active`, `degraded`, `blocked`, `wipe_pending`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `provisioning` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `degraded` | GAP | GAP | GAP | entity-specific, see capability model |
| `blocked` | GAP | GAP | GAP | entity-specific, see capability model |
| `wipe_pending` | GAP | GAP | GAP | entity-specific, see capability model |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. unique(tenant_id, device_ref, principal_id). A shared device holds one store per principal and the stores never merge, because a queued mutation belongs to the person who made it and replaying it under another identity would falsify the record.
2. scope_expression is derived from the principal's live permission scope at each pull and is never widened locally. A local store may hold less than the principal can see and never more.
3. queued_financial_count above zero is a defect. The kernel forbids offline financial mutations, so a non-zero value means a client bypassed the rule and it is raised as a security finding rather than as a sync condition.
4. A wipe request is not complete until the device confirms it. An unconfirmed wipe is a device that may still hold data, and treating a request as a completion is how a lost handset is recorded as cleared.
5. dataset_version mismatch blocks push, not pull. A device on an old schema may always receive corrections and may not write against a shape the server no longer has.

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

- Permission matrix: `14-PERMISSIONS/offline_sync/device_store.md`
- Screen specifications: `11-UX/screens/offline_sync/device_store/`
- Test catalogue: `20-TESTING/offline_sync/device_store/`
