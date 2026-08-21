---
doc_id: TEST-TRUST_DEVICE
title: Test catalogue — Trust this device
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Trust this device

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `trust_device` is invoked by an authorised actor, then the declared records are created/updated and events ['device.trusted'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `trust_device` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `trust_device` succeeds. 

**T-006** As `finance` (Finance), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `trust_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `trust_device` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: device below minimum supported app version → expect `E_PRECONDITION`, message: 'Update the app on this device before trusting it.'.

**T-018** Cause: device is blocked → expect `E_PRECONDITION`, message: 'Unblock this device first.'. blocked goes to untrusted, never straight to trusted

**T-019** Cause: label empty or duplicated within the tenant → expect `E_VALIDATION`, message: 'Give this device a name that is unique in this workspace.'. duplicate device labels make a revocation list unusable at 3am, which is exactly when it is read

**T-020** Cause: not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

## Edge cases

**T-021** (EC-01) Trusting a device does not trust the people who use it. A shared device carries no principal authority; every session on it still authenticates a principal.

**T-022** (EC-02) Trusting a device that is bound to a site restricts sessions on it to that site. Attempting a session for another site on that device fails with E_AUTHZ_SCOPE (404), not a message naming the bound site, because the bound site may itself be information the signing-in person should not have.

**T-023** (EC-03) A device fingerprint can change under the platform's control (OS reinstall, app data clear). This mints a NEW device row in untrusted rather than silently re-associating, and the old row goes stale and surfaces in the untrusted stuck-state list. Silent re-association would make the fingerprint worthless as a control.

## Idempotency and concurrency

**T-024** Replaying the same request with the same idempotency key produces one effect and one event.

**T-025** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-026** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-027** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 27**
