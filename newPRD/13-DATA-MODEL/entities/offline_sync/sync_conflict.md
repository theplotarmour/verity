---
doc_id: ENT-SYNC_CONFLICT
title: Entity — Sync Conflict
generated: true
source_model: _model/capabilities/offline_sync.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Sync Conflict

*This document is generated. Edit `_model/capabilities/offline_sync.yaml`, not this file.*

**Capability/module:** `offline_sync` · **Owner scope:** `tenant`

Two versions of the truth about one record, with both retained and a person deciding between them.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `mutation_id` | uuid | yes | no | — | no | no |  |
| `capability_key` | string | yes | no | — | no | no |  |
| `subject_ref` | uuid | yes | no | — | no | no |  |
| `conflicting_fields` | json | yes | no | — | no | no | flat list of field keys that actually differ. A conflict presented as two whole records is one nobody can decide |
| `device_values` | json | yes | yes | — | no | no |  |
| `server_values` | json | yes | yes | — | no | no |  |
| `device_principal_id` | uuid | yes | no | — | no | no |  |
| `server_principal_id` | uuid | no | no | — | no | no | who made the competing change, so both parties can be told and, where possible, can speak to each other |
| `device_occurred_at` | timestamptz | yes | no | — | no | no |  |
| `server_changed_at` | timestamptz | yes | no | — | no | no |  |
| `auto_resolvable` | bool | yes | no | — | no | no | computed from the declared merge strategy of every conflicting field. False whenever any conflicting field has merge_strategy manual |
| `resolution` | enum | yes | no | — | no | no |  |
| `resolved_by_principal_id` | uuid | no | no | — | no | no |  |
| `resolution_reason` | text | no | no | — | no | no |  |
| `resolved_at` | timestamptz | no | no | — | no | no |  |

## 2. Lifecycle

States: `open`, `under_review`, `resolved`, `escalated`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `open` | GAP | GAP | GAP | entity-specific, see capability model |
| `under_review` | GAP | GAP | GAP | entity-specific, see capability model |
| `resolved` | GAP | GAP | GAP | entity-specific, see capability model |
| `escalated` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. device_values and server_values are both immutable and both retained permanently, whatever the resolution. A conflict where the losing version is discarded cannot be reviewed, and reviewing conflicts is the only way the merge strategies ever get corrected.
2. auto_resolvable is false whenever any conflicting field declares merge_strategy manual, and a manual field can never be resolved automatically at any scope.
3. resolution other than unresolved requires resolved_by_principal_id, except where auto_resolvable is true and the resolution followed the declared strategy, in which case the strategy is recorded in place of a principal.
4. both_retained is a legitimate resolution, used where two records should exist rather than one, and it produces a new record rather than editing either.
5. A conflict is never resolved by timestamp alone. Last-write-wins is a merge strategy a field may declare; it is never a default and never a fallback.

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

- Permission matrix: `14-PERMISSIONS/offline_sync/sync_conflict.md`
- Screen specifications: `11-UX/screens/offline_sync/sync_conflict/`
- Test catalogue: `20-TESTING/offline_sync/sync_conflict/`
