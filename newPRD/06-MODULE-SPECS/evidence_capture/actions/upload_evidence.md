---
doc_id: ACT-EVIDENCE_CAPTURE-UPLOAD_EVIDENCE
title: Action — Upload captured evidence
generated: true
source_model: _model/capabilities/evidence_capture.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Upload captured evidence

*This document is generated. Edit `_model/capabilities/evidence_capture.yaml`, not this file.*

**Entity:** `evidence_item` · **Capability:** `evidence_capture`

**Why this exists:** Separated from capture because the two happen at completely different times and under completely different conditions. Modelling them as one act is what produces systems that lose evidence whenever a device is out of signal.


## 1. Specification

### Who can perform it

- the capturing device
- system

### Preconditions

- the item exists in pending_upload
- the device holds the content
- connectivity is available

### Inputs

- item_id
- content
- device_computed_hash

### What is created

None.

### What is modified

- storage_ref
- item state

### What events fire

- evidence.uploaded

### Who is notified

- **to**: the capturing principal and the supervisor; **channel**: in_app; **when**: the item has been pending beyond the alert threshold and has now arrived; **template**: evidence_arrived_late; **batching_policy**: daily digest

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Uploads are per item and independent. A partially uploaded item is resumable by byte range; a resumed upload that produces a different hash is treated as integrity_failed rather than as a fresh upload, because a changed hash on a resumed transfer is exactly what a substitution looks like.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_VERSION` | 409 | the recomputed hash differs from the device-computed hash | *(silent)* | True | the item moves to integrity_failed and the content IS retained. Discarding it would destroy the only copy over what is far more often a transfer fault than a substitution |
| `E_QUOTA` | 402 | tenant storage quota exceeded | Plan limit reached. | False | the item stays pending on the device and the tenant_owner is told, because the alternative is silently losing evidence to a billing condition |
| `E_DEPENDENCY` | 424 | storage backend unavailable | *(silent)* | True | retried with backoff. The item stays pending and its pending clock keeps running, so a long backend outage surfaces as pending-upload alerts rather than as silence |
| `E_PRECONDITION` | 409 | the item was expired or redacted while pending | *(silent)* | False | the upload is refused and the device is told to discard, and the fact that content existed and was not stored is recorded on the tombstone |
| `E_RATE_LIMIT` | 429 | a device uploading beyond the per-device rate | *(silent)* | True | throttled rather than refused. A device syncing a fortnight of backlog is legitimate and must not be blocked; it must simply not saturate the connection for everybody else at that location |

## 3. Edge cases

**EC-01.** A device uploading a fortnight of backlog after a long outage. Throttled, ordered oldest first, and the owning mutations replay with their sessions atomically. Ordering newest first would leave the oldest and most disputed evidence until last, which is exactly backwards.

**EC-02.** An upload arriving after the owning record has been completed and even invoiced. Accepted and attached. The record is updated to show that its evidence is now present, and where a billable outcome was emitted with an evidence-overridden marker, that marker is NOT retrospectively cleared, because the invoice went out saying what it said.

**EC-03.** A handset lost before uploading. The pending items become permanently unrecoverable at the critical threshold and the owning records are marked as having evidence that will never arrive. This is recorded plainly rather than being allowed to look like evidence that was never required.

**EC-04.** Two devices uploading the same item id, which can only happen if a device image was cloned. The first upload wins, the second is compared by hash, and a mismatch raises a security alert rather than an integrity one, because identical ids with different content is not a transfer fault.

**EC-05.** Upload of an item whose session was abandoned. Accepted and stored as orphaned. The bytes exist and somebody captured them, and the abandoned session is the record of why they are not attached to anything.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/evidence_capture/evidence_item/upload_evidence.md`.
