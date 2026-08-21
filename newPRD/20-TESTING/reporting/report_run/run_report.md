---
doc_id: TEST-RUN_REPORT
title: Test catalogue — Run a report
generated: true
source_model: _model/capabilities/reporting.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Run a report

*This document is generated. Edit `_model/capabilities/reporting.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `run_report` is invoked by an authorised actor, then the declared records are created/updated and events ['reporting.run_completed', 'reporting.run_failed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `run_report` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `run_report` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `run_report` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the reader's scope excludes some or all of the population → expect `E_AUTHZ_SCOPE`. rows and aggregates are both projected, the suppressed count is recorded and NOT shown, and where nothing remains the report renders an explicit no-data-within-your-access state rather than zeros. Zeros are a statement that nothing happened

**T-018** Cause: the result exceeds row_limit → expect `E_QUOTA`. the run FAILS rather than truncating. A truncated report renders as a complete one and is acted on as though it were

**T-019** Cause: a metric definition is not agreed or has been retired → expect `E_PRECONDITION`. the report is marked broken and the reason is shown rather than a figure computed without that component

**T-020** Cause: a reporting source is unavailable → expect `E_DEPENDENCY`. the run fails. A partial report is more dangerous than none, because the missing part is invisible

**T-021** Cause: a principal running very large reports repeatedly → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. this is the export-shaped access pattern seen in reporting, and it is limited for the same reason it is limited in search

**T-022** Cause: the run exceeds its timeout → expect `E_INTERNAL`. cancelled with the option to narrow. The reader is told what to change rather than being told it failed

## Edge cases

**T-023** (EC-01) A scheduled report delivered to five recipients with different scopes. Executed five times, once per recipient under their own scope, and each receives their own figures. Running once under the author's scope and distributing would disclose to every recipient everything the author can see, which is the single most likely disclosure in a reporting capability.

**T-024** (EC-02) A cell computed over a population small enough to identify an individual - one person's attendance at a location with one worker. Suppressed per the small-population rule, and the run states that suppression occurred without stating where. Stating where reintroduces the disclosure by elimination.

**T-025** (EC-03) A report spanning a metric definition change. Figures either side of the boundary are rendered with their versions and the boundary is marked. Presenting them as one series would be a comparison of two different numbers with one label.

**T-026** (EC-04) A run against data whose freshness is behind the target. data_as_of is stated on the rendering, always. A figure quoted in a meeting from data that was two hours stale is defensible if the staleness was visible and indefensible if it was not.

**T-027** (EC-05) An integration principal running reports on a schedule. Permitted within its own scope, rate-limited more tightly than a human, and always audited, for the same reason as in search - a service account paginating aggregates is an efficient way to reconstruct a dataset.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `read_sensitive_only` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
