---
doc_id: TEST-RECALL_TICKET
title: Test catalogue — Send work back
generated: true
source_model: _model/capabilities/kitchen_flow.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Send work back

*This document is generated. Edit `_model/capabilities/kitchen_flow.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `recall_ticket` is invoked by an authorised actor, then the declared records are created/updated and events ['preparation.recalled'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `recall_ticket` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `recall_ticket` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `recall_ticket` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `recall_ticket` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `recall_ticket` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no reason chosen → expect `E_VALIDATION`, message: 'Choose what went wrong.'. from a short configured list rather than free text, because free-text reasons on a station display become a single character within a week and the recall report is then worthless

**T-018** Cause: the ticket is still in preparation → expect `E_PRECONDITION`. this is not a recall; the correct act is to reopen the specific step, and the message says so

**T-019** Cause: the ticket was already recalled → expect `E_PRECONDITION`. returns the existing successor. Recalling a recall means working on the successor

**T-020** Cause: the source cannot be told through the port → expect `E_DEPENDENCY`. the recall COMMITS and the notification is queued. The replacement work must start regardless of whether the source system is reachable

## Edge cases

**T-021** (EC-01) Recall of part of a ticket. The successor contains only the affected lines, and the unaffected parts are not redone. Redoing everything is the naive implementation and it doubles the cost of every partial failure.

**T-022** (EC-02) Recall after collection, reported by the source. Fully supported and is the most common case. The successor carries a marker that the original had already left, because that changes both the urgency and the cost.

**T-023** (EC-03) A recall chain. Each successor points at its immediate predecessor and the chain is walked with a depth guard. A second recall of the same request is escalated immediately rather than counted as a pattern, because another attempt is unlikely to fix what two attempts have not.

**T-024** (EC-04) Recall reasons concentrated on one item or one station. This is the entire value of the reason list and it is reported to ops_manager weekly. The report deliberately shows reasons by station and by item separately, because attributing an item problem to a station is how the wrong thing gets fixed.

**T-025** (EC-05) The cost of recalled work. Recorded from the elapsed time and the consumed components of the original steps. Without it a recall looks free, and an operation that believes recalls are free will not reduce them.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
