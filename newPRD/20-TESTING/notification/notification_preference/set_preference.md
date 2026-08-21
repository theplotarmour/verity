---
doc_id: TEST-SET_PREFERENCE
title: Test catalogue — Choose what to be told
generated: true
source_model: _model/capabilities/notification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Choose what to be told

*This document is generated. Edit `_model/capabilities/notification.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `set_preference` is invoked by an authorised actor, then the declared records are created/updated and events ['notification.preference_changed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `set_preference` succeeds. 

**T-006** As `finance` (Finance), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `set_preference` succeeds. 

**T-012** As `consumer` (Consumer (B2C)), invoking `set_preference` succeeds. 

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `set_preference` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `set_preference` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the category contains mandatory templates and the request disables it → expect `E_PRECONDITION`, message: 'Some of these cannot be turned off.'. the request partially succeeds for the non-mandatory templates and the recipient is shown exactly which messages they will still receive and why. Silently ignoring the request is what teaches people to disable notifications at the operating system

**T-018** Cause: quiet hours set with no timezone → expect `E_VALIDATION`, message: 'Choose a timezone.'. never defaulted from the tenant

**T-019** Cause: setting a preference for another principal without authority → expect `E_AUTHZ_SCOPE`, message: 'Not found.'.

**T-020** Cause: an administrator overriding a recipient-set preference with no reason → expect `E_VALIDATION`, message: 'Give a reason. It is shown to them.'.

## Edge cases

**T-021** (EC-01) A recipient disabling every channel for an operationally significant category. Permitted for non-mandatory categories, and their supervisor is told once. It is legitimate and the consequence - that the originating capability cannot rely on reaching them - must be visible to somebody rather than only to the recipient.

**T-022** (EC-02) Quiet hours that span midnight. Supported, and this is where most implementations fail. The window is evaluated as a wrapping interval in the recipient's own timezone, and the test cases for it are generated explicitly.

**T-023** (EC-03) An administrator enabling a channel a recipient turned off. Permitted with a reason and the recipient is told. Doing it silently is the fastest way to lose the recipient's trust in every message the platform sends.

**T-024** (EC-04) A recipient with no preference row at all. The pack default applies. The proportion of recipients who have never set anything is reported, because in a tenant where nobody has ever changed a preference the screen is usually unreachable rather than the defaults perfect.

**T-025** (EC-05) A consumer setting preferences without an account. Handled through the party channel consent record rather than here, and the two are deliberately separate - consent is a lawful basis and a preference is a choice about volume, and conflating them means a withdrawal of consent looks like a preference somebody can flip back.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
