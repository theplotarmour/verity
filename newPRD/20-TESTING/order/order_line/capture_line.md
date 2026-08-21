---
doc_id: TEST-CAPTURE_LINE
title: Test catalogue — Add something to an order
generated: true
source_model: _model/capabilities/order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Add something to an order

*This document is generated. Edit `_model/capabilities/order.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `capture_line` is invoked by an authorised actor, then the declared records are created/updated and events ['order_line.captured'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `capture_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `capture_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `capture_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `capture_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `capture_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `capture_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `capture_line` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `capture_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `capture_line` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `capture_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `capture_line` succeeds. 

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `capture_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `capture_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `capture_line` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `capture_line` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the item is unavailable at this location, channel or instant → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. states the reason - out of window, out of components, discontinued - because the person is standing in front of somebody who asked for it and needs to say something

**T-018** Cause: the option selection violates a group rule → expect `E_VALIDATION`, message: 'field-specific'. names the group and what is required

**T-019** Cause: quantity zero or negative → expect `E_VALIDATION`, message: 'Enter how many.'.

**T-020** Cause: the order has closed or voided → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

**T-021** Cause: the line cannot be priced and the tenant does not permit unpriced capture → expect `E_PRECONDITION`, message: 'This has no price yet.'. the line is still CAPTURED and shown as unpriced where the tenant permits it, because refusing capture at the counter is worse than capturing something that needs a price

**T-022** Cause: the catalogue is unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. on an online device the capture is refused. On a device with a catalogue cache the line is captured against the cached item and re-resolved on sync, which is the whole reason the cache exists

**T-023** Cause: more than max_lines_per_order → expect `E_QUOTA`, message: 'Plan limit reached.'.

## Edge cases

**T-024** (EC-01) Captured offline against a cached catalogue. The line records the cache age and the cached price, and is re-priced on sync. Where the re-priced amount differs, the difference is raised as a conflict rather than silently applied, because somebody has already told a customer a number. This is the single most consequential offline behaviour in the capability.

**T-025** (EC-02) Two identical lines added deliberately. Both persist as separate lines. Collapsing them into a quantity of two is a display choice and must never be a storage choice, because they may be fulfilled separately, modified separately or voided separately.

**T-026** (EC-03) A line captured for an item that becomes unavailable between capture and confirmation. The line is retained and flagged at confirmation rather than removed. Removing somebody's line without telling them is how an order silently ships short.

**T-027** (EC-04) Capture by a consumer through a self-service surface with an option combination that is valid but nonsensical. The model validates only against declared group rules; it has no opinion about sense. Anything more is a catalogue configuration concern and pretending otherwise would put pack-specific logic here, which AET-01 would catch.

**T-028** (EC-05) A line captured against an order that another device has already confirmed. Permitted where the order is still modifiable, and the confirmation state is re-evaluated. This is the normal shape of somebody adding one more thing after saying they were finished.

## Idempotency and concurrency

**T-029** Replaying the same request with the same idempotency key produces one effect and one event.

**T-030** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-031** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-032** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 32**
