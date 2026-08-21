---
doc_id: TEST-RESOLVE_CONFLICT
title: Test catalogue — Decide between two versions
generated: true
source_model: _model/capabilities/offline_sync.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Decide between two versions

*This document is generated. Edit `_model/capabilities/offline_sync.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `resolve_conflict` is invoked by an authorised actor, then the declared records are created/updated and events ['sync.conflict_resolved'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `resolve_conflict` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `resolve_conflict` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `resolve_conflict` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `resolve_conflict` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `resolve_conflict` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the server version changed again since the conflict was raised → expect `E_CONFLICT_VERSION`, message: 'Someone else changed this record.'. a new conflict is raised on the current pair and the previous resolution attempt is retained. Three-way conflicts are rare and silently applying a stale resolution is how the third change disappears

**T-018** Cause: a reason is required for a manual-strategy field and none is supplied → expect `E_VALIDATION`, message: 'Say why. Both people will see it.'.

**T-019** Cause: the conflict is claimed by somebody else → expect `E_PRECONDITION`, message: 'Someone else is looking at this.'. names them and the remaining claim time

**T-020** Cause: the resolver holds no authority over the subject → expect `E_AUTHZ_ENTITY`, message: 'You do not have access to this record type.'.

**T-021** Cause: the resolution would apply a financial field from a device version → expect `E_PRECONDITION`. refused. A financial value cannot arrive from an offline device under any resolution, which is the kernel rule enforced once more at the last possible point

## Edge cases

**T-022** (EC-01) A conflict where the two versions are both correct because they concern different things that happened - a technician recorded a completion and a supervisor recorded a cancellation. both_retained produces two records and the underlying capability decides what that means. Forcing a single winner would erase one of two true facts.

**T-023** (EC-02) Automatic resolution where every conflicting field declares a non-manual strategy. Applied and both parties are still told what happened to their change. Silent automatic resolution is how somebody discovers a fortnight later that their edit never took effect.

**T-024** (EC-03) A conflict on a quantity field with last-write-wins declared. Applied by strategy and counted. The field conflict monitor exists precisely so that a quantity field carrying a careless last-write-wins strategy is discovered from its conflict rate rather than from a stock discrepancy.

**T-025** (EC-04) A conflict whose device principal has since left. The supervisor resolves it, the departed principal is not notified, and the conflict record retains their authorship. Their work is still theirs.

**T-026** (EC-05) A conflict escalated because the two parties disagree with each other. There is no mechanism inside the platform that compels agreement, and the escalated state exists so the disagreement is visible to somebody who can end it. The model does not pretend to arbitrate.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
