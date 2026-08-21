---
doc_id: TEST-QUERY_AUDIT
title: Test catalogue — Search the audit trail
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Search the audit trail

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `query_audit` is invoked by an authorised actor, then the declared records are created/updated and events [] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `query_audit` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `query_audit` succeeds. 

**T-004** As `tenant_owner` (Owner / Director), invoking `query_audit` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `query_audit` succeeds. 

**T-006** As `finance` (Finance), invoking `query_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `query_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `query_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `query_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `query_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `query_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `query_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `query_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `query_audit` succeeds. 

**T-015** As `integration_principal` (Integration / Service Account), invoking `query_audit` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `query_audit` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: unbounded time window, or a window wider than max_query_window_days → expect `E_VALIDATION`, message: 'Choose a date range of at most N days.'. an unbounded audit query on a large tenant is a denial of service against that tenant's own database

**T-018** Cause: the reader's scope excludes the subject → expect `E_AUTHZ_SCOPE`, message: 'Not found.'. rows outside scope are omitted from results entirely; the result count must not reveal how many were omitted, so counts are also projected

**T-019** Cause: export-shaped querying - repeated wide queries paginating an entire history → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. this pattern is exfiltration wearing a search box, and the rate limit is the control. Legitimate bulk access is export_audit, which is separately gated and separately notified

**T-020** Cause: projection cannot be computed because the authorization_decision port is unavailable → expect `E_INTERNAL`, message: 'A required service is unavailable.'. FAILS CLOSED. No rows are returned unprojected

## Edge cases

**T-021** (EC-01) The reader can see a row but not one of its changed fields. The row is returned with that key absent from before and after, and changed_field_keys still lists the key. This is deliberate - knowing THAT a salary changed is a different disclosure from knowing what it changed to, and an auditor needs the former.

**T-022** (EC-02) An auditor with tenant scope querying actions performed by platform_support under impersonation. Fully visible, including the ticket reference. Support access that a customer cannot audit is not support access.

**T-023** (EC-03) Querying an actor who has since been deactivated. The row still renders with the actor's name as recorded. The current status is shown alongside as no-longer-active, not substituted for the historical name.

**T-024** (EC-04) A query whose free-text term matches content inside a before or after payload the reader cannot see. The row must not match. Matching would turn the search box into an oracle for reading gated fields one guess at a time.

**T-025** (EC-05) Querying across a retention boundary. Expired rows return as tombstones showing that a row existed and was expired by which job, never as an empty result, because an empty result is indistinguishable from nothing having happened.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
