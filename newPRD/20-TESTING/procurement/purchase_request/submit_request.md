---
doc_id: TEST-SUBMIT_REQUEST
title: Test catalogue — Ask for something
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Ask for something

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `submit_request` is invoked by an authorised actor, then the declared records are created/updated and events ['purchase_request.submitted'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `submit_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `submit_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `submit_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `submit_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `submit_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `submit_request` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `submit_request` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `submit_request` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `submit_request` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `submit_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `submit_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `submit_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `submit_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `submit_request` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `submit_request` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no lines → expect `E_VALIDATION`, message: 'Add at least one item.'.

**T-018** Cause: a line has both an item and a free-text description → expect `E_VALIDATION`, message: 'field-specific'.

**T-019** Cause: no approver can be resolved for this scope and value → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the missing approval configuration. The request is still CREATED in draft rather than lost, because the requester still needs the thing and the fix is an administrator's job

**T-020** Cause: estimated costs supplied without view_financial → expect `E_AUTHZ_FIELD`. dropped. The request proceeds with quantities and descriptions, which is the common case for a person on a location who knows what is needed and not what it costs

**T-021** Cause: open request limit reached → expect `E_QUOTA`, message: 'Plan limit reached.'.

## Edge cases

**T-022** (EC-01) A request raised automatically by a low balance. Idempotent on the source reference, so a nightly rule produces one open request rather than thirty. When the balance recovers before approval the request is not auto-cancelled; the approver is shown the current balance alongside, and decides.

**T-023** (EC-02) A request for something not in the catalogue. Fully supported as free text, and this is the majority case in several target segments. The commitment raised from it carries the free text through to the supplier, and no stock movement results unless somebody catalogues it later.

**T-024** (EC-03) A request submitted offline from a location with no signal. Queued. The approver is notified on sync, and the notification carries both the claimed submission time and the arrival time, because needed_by dates are frequently already past by the time the request lands.

**T-025** (EC-04) Self-approval. Permitted only below a configured value and only where the tenant has explicitly enabled it, because for a two-person business requiring a second approver makes the capability unusable. Where permitted it is always recorded as self-approved and reported.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
