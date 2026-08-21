---
doc_id: TEST-AUTHENTICATE_PHONE_OTP
title: Test catalogue — Sign in with phone and OTP
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Sign in with phone and OTP

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `authenticate_phone_otp` is invoked by an authorised actor, then the declared records are created/updated and events ['session.created', 'principal.authenticated'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `authenticate_phone_otp` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `authenticate_phone_otp` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: wrong OTP → expect `E_AUTHN`, message: 'That code is incorrect.'. max 5 verify attempts per OTP, then OTP is burned

**T-018** Cause: expired OTP → expect `E_AUTHN`, message: 'That code has expired. Request a new one.'. OTP TTL 5 minutes

**T-019** Cause: OTP resend abuse → expect `E_RATE_LIMIT`, message: 'Wait before requesting another code.'. 3 sends per phone per 15 min, exponential backoff 30s/60s/300s

**T-020** Cause: SMS gateway down → expect `E_DEPENDENCY`, message: 'We could not send the code. Try WhatsApp instead.'. automatic channel fallback SMS -> WhatsApp authentication template

## Edge cases

**T-021** (EC-01) Same phone number reused after an employee leaves and a new employee gets the recycled SIM -> phone is NOT an identity. On employee deactivation the phone is released from the principal after a tenant-configured cooling period (default 30 days) and re-registration requires supervisor confirmation.

**T-022** (EC-02) OTP delivered but user is offline -> OTP verification requires connectivity. There is no offline first-login. Devices are provisioned online, then may go offline.

**T-023** (EC-03) Two principals in different tenants share one phone number (a supervisor who moonlights) -> permitted; after OTP success the tenant picker appears.

## Idempotency and concurrency

**T-024** Replaying the same request with the same idempotency key produces one effect and one event.

**T-025** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-026** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-027** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 27**
