---
doc_id: TEST-UNBLOCK_DEVICE
title: Test catalogue — Unblock a device
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Unblock a device

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `unblock_device` is invoked by an authorised actor, then the declared records are created/updated and events ['device.unblocked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `unblock_device` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `unblock_device` succeeds. 

**T-006** As `finance` (Finance), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `unblock_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `unblock_device` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: device is not blocked → expect `E_PRECONDITION`, message: 'This device is not blocked.'.

**T-018** Cause: not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

## Edge cases

**T-019** (EC-01) Unblocking returns the device to untrusted, never to its previous trusted status. Re-granting trust is a separate, separately audited decision.

**T-020** (EC-02) Any queued mutations tagged uploaded_after_device_block remain tagged after unblocking. Unblocking a device does not retrospectively bless writes made while it was blocked.

## Idempotency and concurrency

**T-021** Replaying the same request with the same idempotency key produces one effect and one event.

**T-022** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-023** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-024** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 24**
