---
doc_id: TEST-LOGOUT
title: Test catalogue — Log out (this device)
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Log out (this device)

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `logout` is invoked by an authorised actor, then the declared records are created/updated and events ['session.revoked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `logout` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `logout` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: network unavailable at logout → expect `E_DEPENDENCY`. see offline edge case, this is NOT surfaced as a failure

## Edge cases

**T-018** (EC-01) OFFLINE LOGOUT: user taps Log out with no connectivity and a non-empty mutation queue. Do NOT silently discard. Present three options: (a) Stay signed in until synced — recommended, default; (b) Log out and keep queued work on this device for this user to sync later — allowed only on non-shared devices, queue stays encrypted at rest keyed to the principal; (c) Log out and discard N unsynced changes — requires typing the count to confirm, emits a client_side_discard telemetry event, and is refused entirely if any queued mutation is financial or attendance-related.

**T-019** (EC-02) SHARED DEVICE LOGOUT: on device.shared=true, logout also clears the fast-switch PIN cache and returns to the roster picker, not to the marketing login screen.

**T-020** (EC-03) FIXED-STATION LOGOUT: a station display bound to a site does not truly log out to an anonymous state — it returns to a station picker while retaining the device-level station credential. A human logging out of one must not orphan the work in progress on it; that work is already server-side, so this is safe, but the client must confirm 'N items in progress remain on the server' rather than showing an empty screen.

**T-021** (EC-04) LOGOUT DURING AN IN-FLIGHT MUTATION: the mutation is allowed to complete server-side; the session is revoked at the transaction boundary, not mid-transaction. The result is written to the audit log with the pre-revocation session id.

**T-022** (EC-05) LOGOUT WHILE IMPERSONATED: if impersonated_by_principal_id is set, 'log out' ends the impersonation and returns the operator to their own HQ session; it does not log out the impersonated users real sessions.

**T-023** (EC-06) DOUBLE LOGOUT / already-revoked session: idempotent. Returns 2xx. Never an error.

**T-024** (EC-07) Logout does not revoke other sessions. That is logout_all.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
