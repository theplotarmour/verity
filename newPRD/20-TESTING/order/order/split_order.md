---
doc_id: TEST-SPLIT_ORDER
title: Test catalogue — Split an order
generated: true
source_model: _model/capabilities/order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Split an order

*This document is generated. Edit `_model/capabilities/order.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `split_order` is invoked by an authorised actor, then the declared records are created/updated and events ['order.split'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `split_order` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `split_order` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `split_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `split_order` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the split would leave one side with no lines → expect `E_VALIDATION`, message: 'Both parts need at least one line.'. a split producing an empty order is a reference number attached to nothing, and it will be chased by somebody

**T-018** Cause: a payment has already been taken against the whole order → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the correct path is a refund and re-take, or a manual allocation, because splitting a captured payment is a payment-provider operation this capability may not perform

**T-019** Cause: a line to be moved is already fulfilled and its billable outcome emitted → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. moving an already-billed line would produce two billable outcomes for one piece of work

**T-020** Cause: a single line is to be divided between the two sides → expect `E_VALIDATION`, message: 'Split a line into two lines first.'. dividing one line across two orders makes the quantity and the price ambiguous on both, so the model requires the division to be explicit

## Edge cases

**T-021** (EC-01) Splitting an order where only some lines have been fulfilled. Fulfilled lines whose outcomes have not yet been emitted may move; those already emitted may not. The error names which, so the person can decide rather than guess.

**T-022** (EC-02) Splitting to an anonymous party. Fully supported; the new order simply has no party. The common case is one person paying for their own items out of a group.

**T-023** (EC-03) Splitting a line that itself carries a comp or an override. The adjustment travels with the line, together with the principal who authorised it, so authority is never laundered by moving a line to a different order.

**T-024** (EC-04) Splitting an order that is subject to a contract-scoped price. The moved lines are NOT re-priced. Re-pricing on split would change what a customer was quoted at the moment they asked to pay separately, which is the worst possible moment to change a number.

**T-025** (EC-05) Repeated splitting. Supported; split_of_order_id chains and every part points at its immediate origin. Reporting resolves the chain to its root, with a depth guard that alerts rather than looping.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
