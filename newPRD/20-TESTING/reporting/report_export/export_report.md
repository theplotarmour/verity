---
doc_id: TEST-EXPORT_REPORT
title: Test catalogue — Export a report
generated: true
source_model: _model/capabilities/reporting.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Export a report

*This document is generated. Edit `_model/capabilities/reporting.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `export_report` is invoked by an authorised actor, then the declared records are created/updated and events ['reporting.exported'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `export_report` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `export_report` succeeds. 

**T-015** As `integration_principal` (Integration / Service Account), invoking `export_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `export_report` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: purpose empty → expect `E_VALIDATION`, message: 'State why you are exporting. It is recorded and shown to the workspace owner.'.

**T-018** Cause: the report is financial or sensitive and the session is not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-019** Cause: the row count exceeds max_export_rows → expect `E_QUOTA`, message: 'Plan limit reached.'. narrow the period. An export of an entire history is a migration and belongs to a different, separately authorised path

**T-020** Cause: the run has expired → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. re-run first, so that the exported figures are computed under the reader's current scope rather than a stale one

**T-021** Cause: repeated exports of overlapping periods → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. this pattern is a bulk extraction assembled from pieces and it is limited for that reason

## Edge cases

**T-022** (EC-01) An export by a reader whose gates withheld fields. The file states which fields were withheld and under which gate. A recipient reading a partial file as complete is how a decision gets made on data somebody was deliberately not shown.

**T-023** (EC-02) Two readers exporting the same report and receiving different files. Correct and expected, and the watermark identifies whose file each is. Without it two partial files circulate and neither can be attributed.

**T-024** (EC-03) An export link forwarded outside the tenant. The link expires and is non-guessable, and the watermark in the file identifies who took it. The model cannot prevent forwarding and makes the copy attributable, which is the honest limit of what it can do.

**T-025** (EC-04) An auditor exporting an entire period as evidence. Supported and is a legitimate primary use, and it is exactly the same path with the same audit record as any other export. There is no privileged export that avoids the trail.

**T-026** (EC-05) An export requested for a run whose small-population cells were suppressed. The suppression carries into the file. Exporting is never a route to the cells the interface withheld.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
