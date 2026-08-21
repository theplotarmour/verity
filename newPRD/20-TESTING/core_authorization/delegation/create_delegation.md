---
doc_id: TEST-CREATE_DELEGATION
title: Test catalogue — Delegate authority during an absence
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Delegate authority during an absence

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `create_delegation` is invoked by an authorised actor, then the declared records are created/updated and events ['delegation.created'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `create_delegation` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `create_delegation` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: window exceeds max_delegation_days → expect `E_VALIDATION`, message: 'A delegation can last at most N days. For anything longer, grant a role.'. the message names the correct alternative rather than only refusing

**T-018** Cause: the delegator is acting under a delegation → expect `E_PRECONDITION`, message: 'You cannot pass on authority that was delegated to you.'.

**T-019** Cause: verb_subset contains administer → expect `E_VALIDATION`, message: 'Configuration authority cannot be delegated.'.

**T-020** Cause: verb_subset contains a verb the delegator does not hold → expect `E_AUTHZ_ENTITY`, message: 'You cannot delegate access you do not have.'.

**T-021** Cause: a different overlapping delegation to the same delegate already exists → expect `E_CONFLICT_UNIQUE`, message: 'You already have a different delegation to this person in this period.'.

## Edge cases

**T-022** (EC-01) The delegator loses a permission while the delegation is active. The delegate loses it in the same instant, because evaluation is against the delegator's live permissions rather than a snapshot. This is stated in the invariants because the snapshot design is the intuitive one and it is wrong.

**T-023** (EC-02) The delegator is suspended or deactivated. All their active delegations are revoked immediately with reason=delegator_unavailable, and both parties plus the tenant_admin are told. A delegation outliving its delegator is a permission with no owner.

**T-024** (EC-03) The delegate is already more privileged than the delegator. The delegation grants nothing new and is refused at creation with a message saying so, rather than being created as a no-op that somebody will later assume is doing something.

**T-025** (EC-04) Actions performed under a delegation are attributed to the delegate AND record the delegation id and the delegator. Both names appear in the audit and in any approval record. Attributing only to the delegate loses accountability; attributing only to the delegator is a lie.

**T-026** (EC-05) A delegation spanning a capability being disabled. The delegated verbs on that capability simply resolve to deny, matching the behaviour of a normal grant against a disabled capability.

**T-027** (EC-06) The delegate declines. Modelled as revoke_delegation by to_principal, not as a separate rejection state, so that there is one revocation path and one audit shape.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
