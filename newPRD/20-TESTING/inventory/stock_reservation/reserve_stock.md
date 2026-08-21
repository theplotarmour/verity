---
doc_id: TEST-RESERVE_STOCK
title: Test catalogue — Reserve stock
generated: true
source_model: _model/capabilities/inventory.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Reserve stock

*This document is generated. Edit `_model/capabilities/inventory.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `reserve_stock` is invoked by an authorised actor, then the declared records are created/updated and events ['stock.reserved'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `reserve_stock` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `reserve_stock` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `reserve_stock` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `reserve_stock` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `reserve_stock` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: quantity not positive → expect `E_VALIDATION`, message: 'field-specific'.

**T-018** Cause: the location is suspended or retired → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

**T-019** Cause: expires_at in the past → expect `E_VALIDATION`, message: 'field-specific'.

**T-020** Cause: more than max_open_reservations_per_source → expect `E_QUOTA`, message: 'Plan limit reached.'. catches a workflow creating a reservation per attempt rather than per claim

## Edge cases

**T-021** (EC-01) A reservation with no expiry. Permitted and monitored, because a genuinely open-ended reservation exists - stock set aside for a long-running commitment - and forbidding it would push the practice into a physically separated shelf that the system knows nothing about.

**T-022** (EC-02) Reserving more than is on hand. Permitted where the location allows negative. Available goes negative, which is the honest representation of having promised more than is held, and it is exactly the number a purchaser needs.

**T-023** (EC-03) A reservation whose source disappears - the claiming capability is disabled. The reservation persists and appears in the open-reservation monitor with its source named as unavailable. Auto-releasing on capability disable would free stock that a re-enabled capability still expects.

**T-024** (EC-04) Consuming against the wrong reservation. Not prevented; reservations are claims and the movement records which one it discharged. The reconciliation is visible because both the reservation and the movement carry their source references.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
