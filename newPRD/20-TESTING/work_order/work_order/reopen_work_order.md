---
doc_id: TEST-REOPEN_WORK_ORDER
title: Test catalogue — Reopen completed work
generated: true
source_model: _model/capabilities/work_order.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Reopen completed work

*This document is generated. Edit `_model/capabilities/work_order.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `reopen_work_order` is invoked by an authorised actor, then the declared records are created/updated and events ['work_order.reopened', 'work_order.submitted'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `reopen_work_order` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `reopen_work_order` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `reopen_work_order` succeeds. 

**T-012** As `consumer` (Consumer (B2C)), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `reopen_work_order` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `reopen_work_order` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: outside the reopen window → expect `E_PRECONDITION`, message: 'This was completed too long ago to reopen. Raise new work instead.'. offers the alternative rather than only refusing

**T-018** Cause: reason empty → expect `E_VALIDATION`, message: 'Say what went wrong. It is shown to the person who did the work.'.

**T-019** Cause: the original is already reopened → expect `E_PRECONDITION`. returns the existing successor. Reopening a reopened order means working on the successor, not creating a sibling

**T-020** Cause: a customer_contact reopening an order that is not theirs → expect `E_AUTHZ_SCOPE`, message: 'Not found.'.

## Edge cases

**T-021** (EC-01) Reopened by the requesting party through the customer surface. Fully supported and is the case that matters most, because a counterparty who cannot reopen will telephone, and the telephone call is not in any report. The reopen carries their reason verbatim.

**T-022** (EC-02) The successor is billable or not. Deliberately undetermined by default rather than defaulting to not_billable. Whether a return visit is chargeable is a contractual question this capability cannot answer, and defaulting it either way is a revenue decision made by a schema.

**T-023** (EC-03) The original assignee has since ended their engagement. The successor is unassigned and the notification about the reopen is not sent to them. The original remains attributed to them, because it was theirs.

**T-024** (EC-04) Reopening a work order whose subject has been retired. Permitted, with the subject shown as retired. Work is frequently reopened precisely because the subject was replaced.

**T-025** (EC-05) A reopen chain crossing a work_type version change. The successor uses the CURRENT work type and its current checklist, and records that it differs from the original's. Reusing a superseded template for a new piece of work would mean asking questions the tenant has decided to stop asking.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
