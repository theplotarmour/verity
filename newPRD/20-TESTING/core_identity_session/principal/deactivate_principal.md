---
doc_id: TEST-DEACTIVATE_PRINCIPAL
title: Test catalogue — Close a person's account
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Close a person's account

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `deactivate_principal` is invoked by an authorised actor, then the declared records are created/updated and events ['principal.deactivated', 'membership.revoked', 'session.revoked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `deactivate_principal` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `deactivate_principal` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `deactivate_principal` succeeds. 

**T-006** As `finance` (Finance), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `deactivate_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `deactivate_principal` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: last active tenant_owner → expect `E_PRECONDITION`, message: 'This is the only owner of this workspace. Transfer ownership first.'.

**T-018** Cause: confirmation phrase mismatch → expect `E_VALIDATION`, message: 'The name does not match.'.

**T-019** Cause: principal holds an integration_principal archetype with live integrations bound to it → expect `E_PRECONDITION`, message: 'This service account is in use by N integrations. Rotate them first.'. names the integrations; closing a service account silently is how a nightly sync dies without anyone noticing until month end

**T-020** Cause: not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

## Edge cases

**T-021** (EC-01) Operational history is never deleted. Records the person created remain, attributed to the closed principal and rendered with a no-longer-active marker. This is not a soft delete of their work; it is the correct answer for an audit trail.

**T-022** (EC-02) The person's phone number and email are retained on the principal row until the release cooling period lapses (default 30 days, tenant-configurable), then released so a recycled SIM can be onboarded as a new principal. Release is a scheduled job, is audited, and is what prevents the recycled-SIM identity collision described under authenticate_phone_otp.

**T-023** (EC-03) A data-subject erasure request against a deactivated principal is a DIFFERENT operation, handled by core_audit's retention and legal-hold machinery, and is constrained by any legal hold. Deactivation is not erasure and the UI must not imply that it is.

**T-024** (EC-04) Deactivating a principal who is the sole approver in a live approval chain. Refused unless the approval_fallback policy resolves to a reachable approver; the error names the chains that would stall.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
