---
doc_id: TEST-PROPOSE_MERGE
title: Test catalogue — Propose that two records are the same party
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Propose that two records are the same party

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `propose_merge` is invoked by an authorised actor, then the declared records are created/updated and events ['party.merge_proposed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `propose_merge` succeeds. 

**T-006** As `finance` (Finance), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `propose_merge` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `propose_merge` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `propose_merge` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `propose_merge` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: a live proposal already exists for this pair → expect `E_CONFLICT_UNIQUE`. returns the existing proposal with 200

**T-018** Cause: either party is already merged, archived or blocked → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

**T-019** Cause: the pair was rejected and neither party has changed materially since → expect `E_PRECONDITION`. silently suppressed for a system_rule proposer, refused with a message for a human proposer who is presumably looking at evidence the rule cannot see

**T-020** Cause: survivor and absorbed are the same party → expect `E_VALIDATION`, message: 'These are the same record.'.

## Edge cases

**T-021** (EC-01) Three parties that are all duplicates of each other. Three pairwise proposals are raised, not one three-way merge. Merging pairwise is reviewable; a three-way merge presents a conflict matrix no reviewer can hold in their head. After the first merge the remaining proposals are re-scored against the survivor.

**T-022** (EC-02) A rule proposes a merge between a party of kind=person and one of kind=organisation. Refused. A sole trader who is both is modelled as an organisation party with a person party related to it, not as one record that is both.

**T-023** (EC-03) The survivor choice matters and the rule cannot make it well. The shipped default proposes the OLDER record as survivor, on the grounds that it has more history attached, and the reviewer may swap them. Swapping is offered prominently rather than buried, because the default is right perhaps two thirds of the time.

**T-024** (EC-04) A proposal raised against a party in an active workflow. Permitted to propose, refused to execute while any workflow instance holds a lock on either party, and the proposal states which workflow is blocking so the reviewer waits rather than forcing.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
