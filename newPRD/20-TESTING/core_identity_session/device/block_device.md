---
doc_id: TEST-BLOCK_DEVICE
title: Test catalogue — Block a device
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Block a device

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `block_device` is invoked by an authorised actor, then the declared records are created/updated and events ['device.blocked', 'session.revoked'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `block_device` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `block_device` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `block_device` succeeds. 

**T-006** As `finance` (Finance), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `block_device` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `block_device` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: reason empty → expect `E_VALIDATION`, message: 'Give a reason. It is recorded.'.

**T-018** Cause: not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-019** Cause: device is the last device with an active session for a surface that cannot be re-provisioned remotely → expect `E_PRECONDITION`, message: 'Blocking this leaves no way to operate this surface until a new device is provisioned on site.'. a warning that must be acknowledged, not a refusal; the administrator may well be blocking it precisely because it was stolen

## Edge cases

**T-020** (EC-01) A blocked device that is offline keeps working until it reaches the server. This is unavoidable in an offline-first system and is stated in the security model rather than hidden. Mitigation: offline_grace_hours caps the window, and financial actions are never permitted offline. The block confirmation states the worst-case exposure window in hours so the administrator can decide whether to also suspend the principals.

**T-021** (EC-02) {'Blocking a device with an unsynced mutation queue. The queue is not discarded. If the device ever reconnects it may upload the queue, and every uploaded mutation is tagged uploaded_after_device_block for review rather than being silently accepted or silently dropped. Both silent options are wrong': "silent acceptance launders a stolen device's writes, silent dropping destroys a day of a worker's legitimate work."}

**T-022** (EC-03) Blocking a shared device that is a bound KDS or POS terminal ends the station's operation. The action names the station and the count of in-flight work before proceeding.

## Idempotency and concurrency

**T-023** Replaying the same request with the same idempotency key produces one effect and one event.

**T-024** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-025** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-026** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 26**
