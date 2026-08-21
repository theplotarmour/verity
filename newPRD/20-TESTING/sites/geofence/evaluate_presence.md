---
doc_id: TEST-EVALUATE_PRESENCE
title: Test catalogue — Evaluate whether a position is at a location
generated: true
source_model: _model/capabilities/sites.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Evaluate whether a position is at a location

*This document is generated. Edit `_model/capabilities/sites.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `evaluate_presence` is invoked by an authorised actor, then the declared records are created/updated and events [] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `evaluate_presence` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `evaluate_presence` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `evaluate_presence` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no active geofence for this location at captured_at → expect `E_PRECONDITION`. returns inconclusive with the reason, NOT outside. Absence of a boundary is not evidence of absence from a place

**T-018** Cause: reported_accuracy_m absent → expect `E_VALIDATION`. refused. A position with no stated accuracy cannot be evaluated honestly and accepting one would mean guessing the accuracy, which is how the accuracy floor gets silently bypassed

**T-019** Cause: captured_at more than presence_staleness_minutes in the past → expect `E_VALIDATION`. returns inconclusive. A twenty-minute-old fix says where somebody was, not where they are

**T-020** Cause: the location has no position → expect `E_DEPENDENCY`. returns inconclusive with the reason, and raises the geofence-quality condition described in the stuck-state policy

## Edge cases

**T-021** (EC-01) reported_accuracy_m worse than min_accuracy_m. Returns inconclusive, never outside. This is the single most consequential line in this capability: a person standing inside a building whose phone reports 300m accuracy has not left the location, and any system that records them as outside will be used to withhold pay and will be wrong.

**T-022** (EC-02) A position that is inside by less than tolerance_m of the boundary. Returns inside, and the margin is reported so a consumer can distinguish comfortably-inside from just-inside. Consumers that need the distinction have it; consumers that do not can ignore it.

**T-023** (EC-03) A device with location spoofing. Not detectable from the position alone. The evaluation records the device id and the reported accuracy pattern, and detection is explicitly out of scope for this capability and flagged as an open question rather than claimed.

**T-024** (EC-04) Two overlapping geofences for locations in the same building. Both can return inside. This capability returns per-location verdicts and does not arbitrate; disambiguating which location somebody is at is the consuming capability's problem and usually needs a second signal.

**T-025** (EC-05) Evaluation on an offline device. Performed locally against the cached geofence, and the result is marked as locally-evaluated. On sync the server re-evaluates against the authoritative geofence version and, where the verdicts differ, records both. The server verdict governs and the disagreement is retained, because a disagreement between the device and the server is exactly the evidence a dispute needs.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `read_sensitive_only` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
