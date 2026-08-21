---
doc_id: TEST-PROCESS_INBOUND
title: Test catalogue — Accept an inbound call
generated: true
source_model: _model/capabilities/integrations.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Accept an inbound call

*This document is generated. Edit `_model/capabilities/integrations.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `process_inbound` is invoked by an authorised actor, then the declared records are created/updated and events ['integration.inbound_accepted', 'integration.inbound_rejected'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `process_inbound` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `process_inbound` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `process_inbound` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the signature does not verify → expect `E_AUTHN`. rejected with no parsing and no processing. Verification precedes parsing, always, because parsing untrusted input before verifying it is the vulnerability

**T-018** Cause: the connection acting principal lacks permission for the mapped action → expect `E_AUTHZ_ENTITY`. rejected and recorded. An integration never has implicit authority, and a permission it lacks is a configuration error rather than a reason to bypass the check

**T-019** Cause: the payload does not match the mapping → expect `E_VALIDATION`. rejected and recorded with a bounded excerpt. Repeated identical failures trigger quarantine so one broken feed produces one conversation rather than ten thousand rejections

**T-020** Cause: the idempotency key has been seen → expect `E_CONFLICT_UNIQUE`. the stored response is replayed and the request is recorded as a duplicate. The caller sees exactly what they saw the first time

**T-021** Cause: the caller exceeded the connection rate limit → expect `E_RATE_LIMIT`. rejected with a retry-after. Verity states its own limits rather than silently queueing, because a caller that does not know it is being limited will simply send more

**T-022** Cause: the mapped action failed for an unexpected reason → expect `E_INTERNAL`. a 5xx is returned so the caller retries, AND the failure response is stored against the idempotency key so the retry converges rather than re-executing. Returning success on an internal failure is how data is silently lost at a boundary

## Edge cases

**T-023** (EC-01) A call arriving at an endpoint with no attributable connection. Recorded with connection_id null, rejected, and reported. This is either a misconfiguration or a probe, and both are worth seeing; discarding unattributable calls silently is how the first is never noticed.

**T-024** (EC-02) A caller retrying after a timeout where the original succeeded. The idempotency record replays the original response. Without the record the caller creates a duplicate of whatever the action was, which for an order or a payment is the expensive case.

**T-025** (EC-03) A caller that sends no idempotency key and no event identifier. Deduplicated on a payload hash within a short window, which is weaker and is stated as weaker on the connection's own surface, so the tenant knows the guarantee they actually have with that far side.

**T-026** (EC-04) A burst of identical validation failures - a far side that changed its format. Quarantine after the burst threshold, with a sample shown to the owner. Processing every one of ten thousand identical failures generates ten thousand audit rows and one very unhappy operator.

**T-027** (EC-05) An inbound call that would create a record the acting principal could see but not create. Rejected on the create check. The permission model is evaluated in full for an integration exactly as for a person, which is the point of giving the connection a principal rather than a bypass.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
