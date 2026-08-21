---
doc_id: ACT-SITES-EVALUATE_PRESENCE
title: Action — Evaluate whether a position is at a location
generated: true
source_model: _model/capabilities/sites.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Evaluate whether a position is at a location

*This document is generated. Edit `_model/capabilities/sites.yaml`, not this file.*

**Entity:** `geofence` · **Capability:** `sites`

**Why this exists:** The single most misused primitive in field operations software. Modelled explicitly so that its three-valued result, its accuracy floor and its margin are contractual rather than left to whoever implements it.


## 1. Specification

### Who can perform it

- system
- integration_principal
- any_authenticated

### Preconditions

- an active geofence exists for the location at the evaluation instant

### Inputs

- location_id
- position
- reported_accuracy_m
- captured_at
- device_id

### What is created

- presence_evaluation record where the caller requests evidence retention

### What is modified

None.

### What events fire

None.

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Pure evaluation against an immutable versioned geofence. Concurrency is irrelevant, which is itself the point of versioning geofences rather than editing them.

### Audit class

read_sensitive_only

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | no active geofence for this location at captured_at | *(silent)* | False | returns inconclusive with the reason, NOT outside. Absence of a boundary is not evidence of absence from a place |
| `E_VALIDATION` | 422 | reported_accuracy_m absent | *(silent)* | False | refused. A position with no stated accuracy cannot be evaluated honestly and accepting one would mean guessing the accuracy, which is how the accuracy floor gets silently bypassed |
| `E_VALIDATION` | 422 | captured_at more than presence_staleness_minutes in the past | *(silent)* | False | returns inconclusive. A twenty-minute-old fix says where somebody was, not where they are |
| `E_DEPENDENCY` | 424 | the location has no position | *(silent)* | True | returns inconclusive with the reason, and raises the geofence-quality condition described in the stuck-state policy |

## 3. Edge cases

**EC-01.** reported_accuracy_m worse than min_accuracy_m. Returns inconclusive, never outside. This is the single most consequential line in this capability: a person standing inside a building whose phone reports 300m accuracy has not left the location, and any system that records them as outside will be used to withhold pay and will be wrong.

**EC-02.** A position that is inside by less than tolerance_m of the boundary. Returns inside, and the margin is reported so a consumer can distinguish comfortably-inside from just-inside. Consumers that need the distinction have it; consumers that do not can ignore it.

**EC-03.** A device with location spoofing. Not detectable from the position alone. The evaluation records the device id and the reported accuracy pattern, and detection is explicitly out of scope for this capability and flagged as an open question rather than claimed.

**EC-04.** Two overlapping geofences for locations in the same building. Both can return inside. This capability returns per-location verdicts and does not arbitrate; disambiguating which location somebody is at is the consuming capability's problem and usually needs a second signal.

**EC-05.** Evaluation on an offline device. Performed locally against the cached geofence, and the result is marked as locally-evaluated. On sync the server re-evaluates against the authoritative geofence version and, where the verdicts differ, records both. The server verdict governs and the disagreement is retained, because a disagreement between the device and the server is exactly the evidence a dispute needs.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/sites/geofence/evaluate_presence.md`.
