---
doc_id: ENT-QUEUED_MUTATION
title: Entity — Queued Mutation
generated: true
source_model: _model/capabilities/offline_sync.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Queued Mutation

*This document is generated. Edit `_model/capabilities/offline_sync.yaml`, not this file.*

**Capability/module:** `offline_sync` · **Owner scope:** `tenant`

One thing somebody did on a device that has not yet been applied on the server, with everything needed to apply it faithfully.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no | minted on the device, so the mutation has an identity before it has ever reached a server |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `device_store_id` | uuid | yes | no | — | no | no |  |
| `sequence_in_device` | bigint | yes | yes | — | no | no | monotonic per device store. Replay order within a device is this, never arrival order, because the person did them in an order and that order carries meaning |
| `capability_key` | string | yes | yes | — | no | no |  |
| `action_key` | string | yes | yes | — | no | no |  |
| `subject_ref` | uuid | no | yes | — | no | no |  |
| `payload` | json | yes | yes | — | no | no |  |
| `base_version` | string | no | yes | — | no | no | the version of the subject the device was looking at when the person acted. The whole conflict model rests on this, and a mutation with no base version can only be applied blind |
| `occurred_at` | timestamptz | yes | yes | — | no | no | when the person did it, from the device clock |
| `queued_at` | timestamptz | yes | yes | — | no | no |  |
| `received_at` | timestamptz | no | no | — | no | no |  |
| `applied_at` | timestamptz | no | no | — | no | no |  |
| `acting_principal_id` | uuid | yes | yes | — | no | no | who did it. Replay attributes to this principal and never to whoever happened to be signed in at sync time |
| `clock_skew_seconds` | int | no | no | — | no | no | computed against the first server contact and retained, because it is the only evidence that occurred_at is unreliable |
| `attached_evidence_ids` | json | no | no | — | no | no | evidence items that must arrive with this mutation. The unit is atomic - neither replays without the other |
| `atomic_group_id` | uuid | no | no | — | no | no | mutations that must apply together or not at all, such as a completion and its stock movements |
| `idempotency_key` | string | yes | yes | — | no | no | carried through to the server action so that a retried push applies once |
| `attempt_count` | int | yes | no | — | no | no |  |
| `conflict_id` | uuid | no | no | — | no | no |  |
| `outcome_code` | string | no | no | — | no | no | the server's response, retained so a device can show the person what happened to their work |

## 2. Lifecycle

States: `queued`, `transmitted`, `applied`, `conflicted`, `rejected`, `abandoned`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `queued` | GAP | GAP | GAP | entity-specific, see capability model |
| `transmitted` | GAP | GAP | GAP | entity-specific, see capability model |
| `applied` | GAP | GAP | GAP | entity-specific, see capability model |
| `conflicted` | GAP | GAP | GAP | entity-specific, see capability model |
| `rejected` | GAP | GAP | GAP | entity-specific, see capability model |
| `abandoned` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Every field except the receipt, application, attempt and conflict fields is immutable. A mutation is a record of what somebody did and editing it falsifies that.
2. Replay within a device store is strictly in sequence_in_device order. Reordering is forbidden even where it would succeed, because the person performed a sequence and later items frequently depend on earlier ones in ways the payload does not express.
3. A mutation whose action is marked financial or permission-affecting is rejected at queue time on the device and, if one arrives anyway, at receipt on the server, as a security finding. This is the kernel rule and it is enforced twice deliberately.
4. A mutation with attached evidence or an atomic_group_id applies only when every member of its unit is present. Partial application of an atomic group is forbidden.
5. A mutation is never deleted. It is applied, superseded by a conflict resolution, or explicitly abandoned with a reason, and all three are retained.

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

- Permission matrix: `14-PERMISSIONS/offline_sync/queued_mutation.md`
- Screen specifications: `11-UX/screens/offline_sync/queued_mutation/`
- Test catalogue: `20-TESTING/offline_sync/queued_mutation/`
