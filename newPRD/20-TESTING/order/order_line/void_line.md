---
doc_id: TEST-VOID_LINE
title: Test catalogue — Take a line off an order
generated: true
source_model: _model/capabilities/order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Take a line off an order

*This document is generated. Edit `_model/capabilities/order.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `void_line` is invoked by an authorised actor, then the declared records are created/updated and events ['order_line.voided'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `void_line` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `void_line` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `void_line` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `void_line` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: reason empty → expect `E_VALIDATION`, message: 'Say why.'.

**T-018** Cause: session not elevated while fulfilment has started → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-019** Cause: the line is already fulfilled → expect `E_PRECONDITION`, message: 'This has already been done.'. the correct path is return_line

**T-020** Cause: the stock sink is unavailable and a reservation is held → expect `E_DEPENDENCY`. the void COMMITS and the release is queued. A void blocked by a stock outage leaves a line on an order that the customer has been told is gone

## Edge cases

**T-021** (EC-01) A void that the fulfilment route refuses because the thing is already made. The line is recorded as produced-and-voided with its cost, and that cost is reported. Absorbing it silently means the tenant never learns what late voids cost, which is the only number that would let them change the behaviour.

**T-022** (EC-02) Voiding every line on a confirmed order. The order does not auto-void; it remains confirmed with zero lines and is flagged, because voiding an order is a separate act with a separate authority and inferring it from an empty line set removes that control.

**T-023** (EC-03) A void performed to correct a mis-keyed item, immediately after capture. The overwhelmingly common case, and it must be one tap with a reason picked from a short list rather than typed. Requiring free text here is how reasons become the letter x.

**T-024** (EC-04) Void rate as a signal. Concentrated voids by one principal are reported as a pattern rather than blocked. Blocking would push the behaviour to not entering the line at all, which is invisible, whereas a high void rate is at least measurable.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
