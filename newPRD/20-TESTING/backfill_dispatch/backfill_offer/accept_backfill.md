---
doc_id: TEST-ACCEPT_BACKFILL
title: Test catalogue — Accept cover
generated: true
source_model: _model/capabilities/backfill_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Accept cover

*This document is generated. Edit `_model/capabilities/backfill_dispatch.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `accept_backfill` is invoked by an authorised actor, then the declared records are created/updated and events ['backfill.accepted', 'backfill.filled'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `accept_backfill` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `accept_backfill` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `accept_backfill` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `accept_backfill` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the offer has expired → expect `E_PRECONDITION`, message: 'This cover has already been taken or has expired.'. deliberately merged with the taken case, because the candidate's next action is identical and distinguishing them only invites a complaint about timing

**T-018** Cause: another candidate accepted first → expect `E_CONFLICT_VERSION`, message: 'This cover has already been taken or has expired.'.

**T-019** Cause: a working-hour limit would be breached → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the limit and the resulting total. This should have been caught at ranking, and reaching it here means the candidate's hours changed in between, which is legitimate and is why the check is repeated

**T-020** Cause: the candidate has acquired an overlapping assignment since the offer was sent → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the clash and its location

**T-021** Cause: the scheduling port is unavailable so the assignment cannot be created → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. acceptance is REFUSED rather than recorded without an assignment. A request marked filled with no assignment behind it is a commitment everybody believes is covered and nobody is assigned to

## Edge cases

**T-022** (EC-01) Accepted by a dispatcher on the candidate's behalf after a telephone call. Fully supported through the spoken_by_dispatcher channel, with the dispatcher recorded as the accepting principal and the candidate notified that cover was accepted on their behalf. The telephone is the fastest channel and leaving it unrecorded would mean the fastest path is invisible in every report.

**T-023** (EC-02) Accepted after the window has started, which happens when somebody is found late and travels immediately. Permitted, and the assignment is created with a start time of now rather than the window start, so that the partial coverage is honest and the person is paid for what they actually work.

**T-024** (EC-03) The accepting candidate then does not turn up. That is a no-show on the resulting assignment and raises a NEW backfill request with cause=no_show, chained to the original. The chain is retained, because a location whose backfills repeatedly fail twice is a different problem from one whose backfills fail once.

**T-025** (EC-04) Acceptance racing a cancellation of the underlying commitment. The cancellation wins and the candidate is told immediately, with the premium honoured where the tenant policy says a short-notice acceptance is compensated even when withdrawn. Whether it is compensated is configuration; that the candidate is told immediately is not.

**T-026** (EC-05) A candidate accepting who is under a delegation or acting on somebody else's behalf. Not permitted. Acceptance commits a person to be somewhere, and it is the one act in the platform that may not be delegated.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
