---
doc_id: ENT-AUDIT_DIGEST
title: Entity — Audit Digest
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Audit Digest

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

**Capability/module:** `core_audit` · **Owner scope:** `platform`

A periodically published, signed summary of a window of audit records, chaining the previous digest. This is what makes tamper evidence provable to a third party rather than merely asserted.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `window_start` | timestamptz | yes | yes | — | no | no |  |
| `window_end` | timestamptz | yes | yes | — | no | no |  |
| `record_count` | bigint | yes | yes | — | no | no |  |
| `first_record_hash` | string | yes | yes | — | no | no |  |
| `last_record_hash` | string | yes | yes | — | no | no |  |
| `merkle_root` | string | yes | yes | — | no | no | over the record hashes in the window, so a single row can be proved to belong to the window without disclosing the rest of the window |
| `previous_digest_signature` | string | no | yes | — | no | no | null only for the first digest of a tenant; this is the field that makes the digests a chain rather than a set |
| `signature` | string | yes | yes | — | no | no |  |
| `signing_key_id` | string | yes | yes | — | no | no |  |
| `published_at` | timestamptz | yes | yes | — | no | no |  |
| `external_anchor_ref` | string | no | yes | — | no | no | an optional reference to a location outside Verity control where the digest was also published; without an external anchor the chain proves internal consistency only |

## 2. Lifecycle

States: `published`, `verified`, `failed_verification`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `published` | GAP | GAP | GAP | entity-specific, see capability model |
| `verified` | GAP | GAP | GAP | entity-specific, see capability model |
| `failed_verification` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Digests are never regenerated. A failed digest run produces a NEW digest covering the extended window, never a replacement for the failed one, because a replaceable digest is not evidence.
2. The signing key is held outside the application's own credential store and is never accessible to any tenant principal or to application code paths that can write audit rows. A system that can both write the record and sign the proof proves nothing.
3. window_end of digest N equals window_start of digest N+1 exactly. Gaps and overlaps both break verification and are detected by the verification sweep.

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

- Permission matrix: `14-PERMISSIONS/core_audit/audit_digest.md`
- Screen specifications: `11-UX/screens/core_audit/audit_digest/`
- Test catalogue: `20-TESTING/core_audit/audit_digest/`
