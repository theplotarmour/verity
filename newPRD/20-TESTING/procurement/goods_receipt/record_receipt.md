---
doc_id: TEST-RECORD_RECEIPT
title: Test catalogue — Record what arrived
generated: true
source_model: _model/capabilities/procurement.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Record what arrived

*This document is generated. Edit `_model/capabilities/procurement.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `record_receipt` is invoked by an authorised actor, then the declared records are created/updated and events ['goods_receipt.recorded', 'stock.received'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `record_receipt` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `record_receipt` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `record_receipt` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `record_receipt` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `record_receipt` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: a line quantity is zero or negative → expect `E_VALIDATION`, message: 'field-specific'. a return is a separate action with its own authority

**T-018** Cause: over-receipt exceeds the tolerance and the tenant refuses over-receipt → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the ordered and received quantities. The default is to PERMIT with the excess flagged, because the goods are on the floor and refusing to record them does not send them back

**T-019** Cause: a receipt with this supplier document reference already exists → expect `E_CONFLICT_UNIQUE`, message: 'This delivery has already been recorded.'. shows the existing receipt, because the receiver''s next question is who recorded it

**T-020** Cause: the commitment is cancelled or closed → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the receipt is still recorded as an unmatched receipt rather than being refused, because the goods arrived and refusing the record loses them

**T-021** Cause: the stock sink is bound but unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. the receipt is REFUSED rather than committing without stock movements. A receipt recorded without its movements means the goods exist commercially and not physically, and reconstructing which receipts were affected afterwards is impractical

**T-022** Cause: unit prices supplied without view_financial → expect `E_AUTHZ_FIELD`. dropped. Quantities and conditions are recordable by any receiver

## Edge cases

**T-023** (EC-01) Goods arriving with no purchase order reference, which is common. Recorded with commitment_id null and reported immediately to finance as an unmatched receipt. It is either an unrecorded purchase, a delivery to the wrong place, or somebody's verbal order, and all three need a person today rather than a queue entry.

**T-024** (EC-02) Partial delivery. Recorded as received quantity below ordered, and the commitment moves to partially received. The outstanding quantity is always expressed as a count rather than a percentage in every notification, because a percentage makes a shortfall look acceptable.

**T-025** (EC-03) Damaged or rejected goods. Recorded on the receipt with a reason and a photograph where evidence capture is bound, and they do NOT create stock. They create a return obligation with a credit expectation, so that rejected goods are neither invisible nor counted as held - the two failure modes of the naive implementation.

**T-026** (EC-04) A receipt recorded offline at a location with no signal. Queued with its evidence as one unit. On sync, stock movements apply in occurred_at order alongside any consumption recorded in the same period, so a consumption recorded after the receipt but occurring before it does not produce a spurious negative.

**T-027** (EC-05) Over-receipt where the supplier shipped more than ordered. Permitted by default with the excess flagged, because the goods are physically present. Whether to keep or return them is a commercial decision and the flag is what makes it a decision rather than an accident.

**T-028** (EC-06) Two people receiving the same delivery at a busy loading point. The supplier document reference collapses them into one receipt. Where no document reference exists, the minute-bucket key catches most of it and the rest surfaces as a duplicate at match time, which is late but visible.

## Idempotency and concurrency

**T-029** Replaying the same request with the same idempotency key produces one effect and one event.

**T-030** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-031** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-032** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 32**
