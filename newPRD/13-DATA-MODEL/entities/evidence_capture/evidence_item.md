---
doc_id: ENT-EVIDENCE_ITEM
title: Entity — Evidence Item
generated: true
source_model: _model/capabilities/evidence_capture.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Evidence Item

*This document is generated. Edit `_model/capabilities/evidence_capture.yaml`, not this file.*

**Capability/module:** `evidence_capture` · **Owner scope:** `tenant`

One captured artefact - a photograph, a signature, a scan, a position or a form response - with its metadata, its integrity information and what it is evidence of.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no | uuid v7, minted on the device so that the reference exists before the upload does |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `kind` | enum | yes | yes | — | no | no |  |
| `subject_capability_key` | string | yes | yes | — | no | no | which capability the evidence belongs to |
| `subject_ref` | uuid | yes | yes | — | no | no | the record it evidences, opaque here and resolved through the evidence_capture port |
| `requirement_key` | string | no | yes | — | no | no | which declared requirement this satisfies - for example the second of two required photographs - so that a requirement can be checked without inspecting content |
| `captured_at` | timestamptz | yes | yes | — | no | no | the device's claimed capture time |
| `received_at` | timestamptz | yes | yes | — | no | no |  |
| `captured_by_principal_id` | uuid | yes | yes | — | no | no |  |
| `device_ref` | uuid | no | yes | — | no | no |  |
| `position` | geo_point | no | yes | — | yes | no |  |
| `position_accuracy_m` | int | no | yes | — | no | no |  |
| `position_verdict` | enum | yes | yes | — | no | no | three-valued, from the presence_evidence port, never a boolean |
| `content_hash` | string | yes | yes | — | no | no | SHA-256 of the stored bytes, computed on the device before upload and recomputed on receipt. A mismatch is a transfer fault or a substitution and both matter |
| `content_size_bytes` | bigint | yes | yes | — | no | no |  |
| `content_type` | string | yes | yes | — | no | no |  |
| `storage_ref` | string | no | no | — | no | no | where the bytes are, once uploaded. Null while the item exists only as a reference on a device |
| `capture_metadata` | json | no | yes | — | no | no | flat scalars captured at the moment - device orientation, whether the camera was live rather than a gallery selection, battery state, whether the clock was network-synchronised. Each is weak on its own and together they are what a dispute is argued over |
| `from_live_capture` | bool | no | yes | — | no | no | whether the item came from a live camera rather than from a stored file. Nullable rather than false, because on many devices this genuinely cannot be determined and asserting false would be a claim the platform cannot support |
| `clock_skew_seconds` | int | no | yes | — | no | no | computed against the receipt time on a device with no network clock, and retained because it is the only evidence that the claimed capture time is unreliable |
| `redacted_at` | timestamptz | no | no | — | no | no |  |
| `redaction_reason` | text | no | no | — | no | no |  |
| `retention_class` | string | yes | no | — | no | no | derived from the requirement at capture and mutable only by a legal hold |
| `expires_at` | timestamptz | no | no | — | no | no |  |

## 2. Lifecycle

States: `pending_upload`, `uploaded`, `verified`, `integrity_failed`, `redacted`, `expired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `pending_upload` | GAP | GAP | GAP | entity-specific, see capability model |
| `uploaded` | GAP | GAP | GAP | entity-specific, see capability model |
| `verified` | GAP | GAP | GAP | entity-specific, see capability model |
| `integrity_failed` | GAP | GAP | GAP | entity-specific, see capability model |
| `redacted` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Every field except storage_ref, the redaction fields, retention_class and expires_at is immutable. Evidence that can be edited is not evidence.
2. content_hash is computed on the device before upload and recomputed on receipt. A mismatch marks the item as integrity_failed and it is never silently accepted.
3. captured_at and received_at are both retained. The gap is the sync lag and it is queryable, because a fortnight of evidence arriving in one burst is the shape of both a broken handset and a fabrication.
4. position_verdict is three-valued plus not-evaluated. No consumer may coerce inconclusive to inside or outside.
5. An item may never be deleted while any legal hold covers it or while the record it evidences is within its own retention period. Expiry destroys content and retains the hash and the metadata, so that a later question about what existed is still answerable.
6. from_live_capture is nullable and a null is never rendered as a negative. A platform that cannot tell must say it cannot tell.

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

- Permission matrix: `14-PERMISSIONS/evidence_capture/evidence_item.md`
- Screen specifications: `11-UX/screens/evidence_capture/evidence_item/`
- Test catalogue: `20-TESTING/evidence_capture/evidence_item/`
