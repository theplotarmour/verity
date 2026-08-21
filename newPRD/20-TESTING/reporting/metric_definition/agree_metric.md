---
doc_id: TEST-AGREE_METRIC
title: Test catalogue — Agree what a number means
generated: true
source_model: _model/capabilities/reporting.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Agree what a number means

*This document is generated. Edit `_model/capabilities/reporting.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `agree_metric` is invoked by an authorised actor, then the declared records are created/updated and events ['reporting.metric_agreed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `agree_metric` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `agree_metric` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `agree_metric` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `agree_metric` succeeds. 

**T-006** As `finance` (Finance), invoking `agree_metric` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `agree_metric` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `agree_metric` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `agree_metric` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `agree_metric` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `agree_metric` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `agree_metric` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `agree_metric` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `agree_metric` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `agree_metric` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `agree_metric` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: decision_question empty → expect `E_VALIDATION`, message: 'What decision is this number for?'. refused. This is the one field that separates a metric from a dashboard tile, and the kernel excludes dashboards

**T-018** Cause: time_basis not stated → expect `E_VALIDATION`, message: 'Choose whether this counts by when it happened or when it was recorded.'. never defaulted. The two give different answers whenever anything arrives late, which in a field operation is constantly

**T-019** Cause: a ratio or rate with no denominator definition → expect `E_VALIDATION`, message: 'Say what this is a proportion of.'.

**T-020** Cause: the filter expression fails static analysis or exceeds the cost ceiling → expect `E_VALIDATION`, message: 'field-specific'. rejected at save rather than timing out during a board meeting

**T-021** Cause: a published figure references the version being revised → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. the correct path is a new version, and the message says so

**T-022** Cause: the definition aggregates a financial field and the agreeing principal lacks view_financial → expect `E_AUTHZ_FIELD`. refused. Agreeing the meaning of a number you cannot see is agreeing to something you have not read

## Edge cases

**T-023** (EC-01) Two metrics with similar labels and different definitions - a completion rate counted by occurrence and another counted by recording. Both are legitimate and both must exist, and the decision question is what distinguishes them for a reader. The model does not prevent near-duplicates; it makes their difference legible.

**T-024** (EC-02) A metric whose exclusions grow over time until the number describes mostly what was excluded. The exclusion share monitor exists for this, and it is the condition under which a metric quietly stops describing reality while continuing to look healthy.

**T-025** (EC-03) A metric agreed by one person where the tenant has only one. Permitted; the guard requires two principals or tenant_owner alone, and a single-person tenant has tenant_owner. Requiring two in a business of one makes the capability unusable, which is the failure mode the kernel warns about for over-configured onboarding.

**T-026** (EC-04) Agreeing a metric over a source that later becomes unreportable when a capability is disabled. The metric survives, reports referencing it break, and the audience is told. Silently dropping it would change every report that used it without anybody noticing.

**T-027** (EC-05) A definition change that makes this quarter incomparable with last. Historical figures keep their version and any rendering that spans the boundary is flagged. This is the single most useful property of versioning definitions and the reason it is worth the machinery.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
