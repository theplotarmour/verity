---
doc_id: ACT-EVIDENCE_CAPTURE-CAPTURE_EVIDENCE
title: Action — Capture evidence
generated: true
source_model: _model/capabilities/evidence_capture.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Capture evidence

*This document is generated. Edit `_model/capabilities/evidence_capture.yaml`, not this file.*

**Entity:** `evidence_item` · **Capability:** `evidence_capture`

**Why this exists:** Performed on a cheap device, outdoors, one-handed, usually with no signal. It has to succeed under all of those conditions, and the design consequence is that capture and upload are separate acts with the reference existing server-side from the first moment.


## 1. Specification

### Who can perform it

- employee
- supervisor
- consumer
- customer_contact

### Preconditions

- a capture session is open
- the requirement resolves
- the device has storage

### Inputs

- session_id
- requirement_key
- kind
- content
- captured_at
- position
- position_accuracy_m
- capture_metadata

### What is created

- evidence_item in pending_upload
- a server-side reference

### What is modified

- session item list

### What events fire

- evidence.captured

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

Items are appended to an open session and do not contend. The server-side reference is created optimistically from the device-minted id on the first sync opportunity, so that a device holding evidence is visible to a supervisor before the bytes arrive. Capture never blocks on any server round trip.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | the session is closed or abandoned | This action is not available in the current state. | False | the item is retained on the device as orphaned and offered for attachment to a new session, because somebody took the photograph |
| `E_VALIDATION` | 422 | the kind does not match the requirement | field-specific | False |  |
| `E_VALIDATION` | 422 | position required and not available on the device | *(silent)* | False | the item is CAPTURED without a position and the requirement is marked unsatisfied. Refusing the capture because a position could not be obtained loses the photograph as well as the position |
| `E_QUOTA` | 402 | device storage exhausted | There is no space left on this device. | False | the surface offers to upload pending items first and states how many are waiting. This is a real and frequent condition on the devices in use and it is where evidence is most often lost |
| `E_VALIDATION` | 422 | content exceeds max_item_bytes | *(silent)* | False | the item is downscaled on the device to the configured maximum and BOTH the original hash and the downscaled hash are recorded, so the transformation is disclosed rather than hidden. An undisclosed transformation would make every hash comparison meaningless |

## 3. Edge cases

**EC-01.** Captured with no connectivity, which is the normal case. The item exists on the device with its hash computed locally and its server-side reference created at the next sync opportunity. Both timestamps are retained, and the gap is the single most useful field for judging a disputed capture.

**EC-02.** A device whose clock is wrong. captured_at is recorded as claimed and clock_skew_seconds is computed against the first server contact. It is never silently corrected, because the skew is the only evidence that the claimed time is unreliable, and correcting it would manufacture a timestamp.

**EC-03.** A photograph selected from a gallery rather than taken live. Recorded with from_live_capture false where the device reports it, and null where it cannot. A requirement demanding live capture is marked satisfied-without-provenance rather than satisfied, so that the tenant knows whether the control is real on the devices they actually issue.

**EC-04.** Capture of a signature. Stored as an image plus the stroke metadata where the device provides it, because the stroke timing is far stronger evidence than the resulting picture and it costs almost nothing to keep.

**EC-05.** A person refusing to be photographed. There is no mechanism to compel it. The requirement goes unsatisfied and the override path with a reason is what records why, which is the correct outcome - a system that has no way to record a refusal produces staff who photograph people who said no.

**EC-06.** Capture against a subject that has been deleted or cancelled since the session opened. The items are retained as orphaned rather than discarded, and reported. Somebody took them, and destroying them because a record was cancelled removes the evidence of what was actually there.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/evidence_capture/evidence_item/capture_evidence.md`.
