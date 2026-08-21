---
doc_id: TEST-VERIFY_QUALIFICATION
title: Test catalogue — Verify a qualification
generated: true
source_model: _model/capabilities/people.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Verify a qualification

*This document is generated. Edit `_model/capabilities/people.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `verify_qualification` is invoked by an authorised actor, then the declared records are created/updated and events ['qualification.verified'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `verify_qualification` succeeds. 

**T-006** As `finance` (Finance), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `verify_qualification` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `verify_qualification` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `verify_qualification` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `verify_qualification` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: valid_to null on a type that expires → expect `E_VALIDATION`, message: 'Enter the expiry date.'. never defaulted from default_validity_months without showing the computed date for confirmation, because a silently computed expiry is one nobody will check against the document

**T-018** Cause: evidence required by the type is absent → expect `E_PRECONDITION`, message: 'Attach the document.'.

**T-019** Cause: valid_to in the past → expect `E_VALIDATION`, message: 'This has already expired.'. accepted with an explicit acknowledgement, because recording a historically valid qualification is legitimate when reconstructing a record

**T-020** Cause: evidence_capture unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. verification with document_seen is refused when the type requires evidence, and permitted when it does not

## Edge cases

**T-021** (EC-01) Verification by the member themselves. Refused for any type that is not self_declarable, and refused always for a mandatory_for_engagement type, which by invariant cannot be self-declarable anyway. The two rules are deliberately redundant.

**T-022** (EC-02) A qualification verified against a document that later proves forged. Handled by revoke_qualification rather than by unverify, because revocation escalates the affected assignments and unverification only lists them. The distinction is the whole reason both actions exist.

**T-023** (EC-03) Verifying with issuer_checked when the issuer's system is unavailable. Not permitted to record issuer_checked on the strength of an intention. The supervisor records document_seen and the weak-verification list picks it up later.

**T-024** (EC-04) A renewal that arrives before the current validity ends. Recorded as a new version of the same qualification row with a continuous history, not a second row, so that "has this person held this continuously" is answerable - which is the question an incident review actually asks.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
