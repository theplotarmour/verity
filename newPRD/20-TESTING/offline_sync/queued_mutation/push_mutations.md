---
doc_id: TEST-PUSH_MUTATIONS
title: Test catalogue — Send queued work
generated: true
source_model: _model/capabilities/offline_sync.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Send queued work

*This document is generated. Edit `_model/capabilities/offline_sync.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `push_mutations` is invoked by an authorised actor, then the declared records are created/updated and events ['sync.pushed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `push_mutations` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `push_mutations` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the subject changed since base_version → expect `E_CONFLICT_VERSION`. a conflict is raised and the mutation is HELD with its evidence. It is never discarded and never force-applied

**T-018** Cause: the acting principal no longer holds the permission the action requires → expect `E_AUTHZ_ENTITY`. REJECTED, not applied. Permission is re-evaluated at replay rather than trusted from queue time, which is what stops work queued before a revocation from applying after it

**T-019** Cause: the subject no longer exists or has moved to a state that forbids the action → expect `E_PRECONDITION`. rejected and held. The most common instance is a completion for a work order cancelled while the device was offline, and the correct outcome is that a person sees it and decides, because the work was done

**T-020** Cause: the payload fails validation against the current schema → expect `E_VALIDATION`. rejected and held with the specific validation error rendered for the person rather than for a log

**T-021** Cause: an atomic group is incomplete because one member's evidence has not uploaded → expect `E_PRECONDITION`. the whole group waits rather than partially applying. A completion applied without its stock movements is the failure this grouping exists to prevent

**T-022** Cause: the mutation is for a financial or permission-affecting action → expect `E_PRECONDITION`. REJECTED and raised as a security finding against the client. The kernel forbids it and the server enforces it independently of the client, because a client that produced one is a client that cannot be trusted to enforce it

**T-023** Cause: the tenant was suspended while the device was offline → expect `E_TENANT_SUSPENDED`. the push is refused and the queue is retained intact. Work is never discarded because of a billing state

## Edge cases

**T-024** (EC-01) A device offline for a fortnight pushing several hundred mutations. Replayed in order, oldest first, with the store's replay halting at the first unresolvable conflict. The person is shown one conflict at a time in the order they created the work, which is the only order in which their own decisions make sense to them.

**T-025** (EC-02) A completion whose work order was cancelled offline. Rejected and held. The work was done and the record of it is the only evidence; discarding it because the record was cancelled destroys the one thing that would let somebody be paid for it.

**T-026** (EC-03) Two devices holding conflicting offline edits to the same record. Whichever arrives first applies; the second conflicts and both versions are retained. Neither is privileged by being first, and the conflict record names both people so they can speak to each other.

**T-027** (EC-04) Attribution at replay. Every applied mutation is attributed to acting_principal_id and to occurred_at, never to whoever synced it or to the moment of arrival. A supervisor who plugs in a technician's handset must not appear as the author of a week of work.

**T-028** (EC-05) A mutation carrying an occurred_at in the future because the device clock is wrong. Applied with the claimed time retained and the skew recorded. Never silently corrected, because the skew is the only evidence that the timestamp is unreliable, and corrected timestamps make an offline dispute unwinnable for the person holding the device.

**T-029** (EC-06) A push interrupted by connectivity loss halfway through. Resumed from the last acknowledged sequence. The idempotency keys make re-sending the boundary mutations harmless, which is why they are carried through to the server actions rather than being a transport-level concern.

## Idempotency and concurrency

**T-030** Replaying the same request with the same idempotency key produces one effect and one event.

**T-031** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-032** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-033** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 33**
