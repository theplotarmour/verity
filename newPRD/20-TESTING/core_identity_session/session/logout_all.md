---
doc_id: TEST-LOGOUT_ALL
title: Test catalogue — Log out of all devices
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Log out of all devices

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `logout_all` is invoked by an authorised actor, then the declared records are created/updated and events ['session.revoked (one per session)', 'principal.all_sessions_revoked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `logout_all` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `logout_all` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `logout_all` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: acting session not elevated when targeting another principal → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-018** Cause: target principal is outside the acting principal's tenant → expect `E_AUTHZ_SCOPE`, message: 'Not found.'.

**T-019** Cause: target is an integration_principal → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. service-account sessions are revoked by revoke_api_key. Conflating the two would let a routine human logout_all silently kill a nightly integration

**T-020** Cause: the push provider is unavailable for token de-registration → expect `E_DEPENDENCY`. revocation still commits and de-registration is queued and retried. A session must never survive because a notification provider was down

## Edge cases

**T-021** (EC-01) The acting session may optionally be preserved ("log out everywhere else"). Default for self-service is to preserve the current session; default for admin action is to revoke everything including any admin-held impersonation session.

**T-022** (EC-02) Service-account sessions are NOT revoked by a human logout_all; they are separate principals. Revoking them is revoke_api_key.

**T-023** (EC-03) {'A revoked session on an offline device keeps working until the device next reaches the server. This is unavoidable and must be stated in the security model, not hidden. Mitigation': 'offline token TTL is capped at tenant policy offline_grace_hours (default 12, max 72) and financial actions are never permitted offline.'}

## Idempotency and concurrency

**T-024** Replaying the same request with the same idempotency key produces one effect and one event.

**T-025** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-026** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-027** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 27**
