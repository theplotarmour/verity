---
doc_id: TEST-CONVERT_TO_WORK
title: Test catalogue — Turn a ticket into work
generated: true
source_model: _model/capabilities/helpdesk.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Turn a ticket into work

*This document is generated. Edit `_model/capabilities/helpdesk.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `convert_to_work` is invoked by an authorised actor, then the declared records are created/updated and events ['ticket.converted_to_work'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `convert_to_work` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `convert_to_work` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `convert_to_work` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `convert_to_work` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `convert_to_work` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the work_generation port is unbound → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the category configuration should already have prevented reaching here, and the check is repeated because a port can be unbound after configuration

**T-018** Cause: no work type resolves and none was chosen → expect `E_VALIDATION`, message: 'Choose what kind of work is needed.'.

**T-019** Cause: the category requires a subject and none is present → expect `E_PRECONDITION`, message: 'Say what this is about.'.

**T-020** Cause: the work capability is unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. conversion is REFUSED rather than recorded optimistically. A ticket showing converted work that does not exist is a reporter who has been promised a visit nobody is arranging

**T-021** Cause: more than max_conversions_per_ticket → expect `E_QUOTA`, message: 'Plan limit reached.'. a ticket generating twenty work items is usually a mis-scoped report and is worth stopping to look at

## Edge cases

**T-022** (EC-01) Converting one ticket into several work items - a report covering three separate problems. Supported, and each work reference is tracked. The ticket resolves only when the reporter is satisfied, not when the work completes, which is why the two are deliberately not coupled.

**T-023** (EC-02) Work completing while the ticket is still awaiting the reporter. The ticket is not auto-resolved. Work being done and a reporter being satisfied are different facts, and a helpdesk that closes on the first produces a stream of reopens.

**T-024** (EC-03) Converting a ticket whose reporter is a counterparty with a contract that makes the work chargeable. The chargeability flows from the work capability and its billing sink, not from here. The helpdesk records that work was raised and never decides what it is worth.

**T-025** (EC-04) A ticket closed while its converted work is still open. Permitted and reported to the supervisor, because a reporter told their matter is closed while the visit is still outstanding will telephone and will be right to.

**T-026** (EC-05) Conversion of a duplicate ticket that was later merged. The work reference travels to the merge target, so the surviving ticket carries the whole picture and the merged one records that it did so.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
