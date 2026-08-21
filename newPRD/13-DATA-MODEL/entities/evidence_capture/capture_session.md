---
doc_id: ENT-CAPTURE_SESSION
title: Entity — Capture Session
generated: true
source_model: _model/capabilities/evidence_capture.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Capture Session

*This document is generated. Edit `_model/capabilities/evidence_capture.yaml`, not this file.*

**Capability/module:** `evidence_capture` · **Owner scope:** `tenant`

The unit of atomicity - the set of evidence captured for one act, which must arrive together with the act itself or not at all.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `subject_capability_key` | string | yes | no | — | no | no |  |
| `subject_ref` | uuid | yes | no | — | no | no |  |
| `opened_at` | timestamptz | yes | no | — | no | no |  |
| `closed_at` | timestamptz | no | no | — | no | no |  |
| `item_ids` | json | yes | no | — | no | no | flat list of evidence item references belonging to this session |
| `required_keys` | json | yes | no | — | no | no | flat list of requirement keys this session must satisfy |
| `satisfied_keys` | json | yes | no | — | no | no | computed at close |
| `override_reason` | text | no | no | — | no | no |  |
| `override_by_principal_id` | uuid | no | no | — | no | no |  |
| `device_ref` | uuid | no | no | — | no | no |  |
| `created_offline` | bool | yes | no | — | no | no |  |

## 2. Lifecycle

States: `open`, `closed`, `closed_with_override`, `abandoned`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `open` | GAP | GAP | GAP | entity-specific, see capability model |
| `closed` | GAP | GAP | GAP | entity-specific, see capability model |
| `closed_with_override` | GAP | GAP | GAP | entity-specific, see capability model |
| `abandoned` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A session and the mutation it evidences form one atomic unit in the offline queue. Neither may be replayed without the other, which is the whole reason this entity exists rather than evidence being attached individually.
2. A session may close with unsatisfied requirements only where an override reason and an overriding principal are recorded.
3. item_ids is append-only while the session is open and frozen at close.
4. A session may not be reopened. Additional evidence after close is a new session linked to the same subject, so that what was present at the moment of the act remains distinguishable from what was added afterwards.

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

- Permission matrix: `14-PERMISSIONS/evidence_capture/capture_session.md`
- Screen specifications: `11-UX/screens/evidence_capture/capture_session/`
- Test catalogue: `20-TESTING/evidence_capture/capture_session/`
