---
doc_id: TEST-ENGAGE_MEMBER
title: Test catalogue — Engage someone
generated: true
source_model: _model/capabilities/people.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Engage someone

*This document is generated. Edit `_model/capabilities/people.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `engage_member` is invoked by an authorised actor, then the declared records are created/updated and events ['workforce_member.engaged'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `engage_member` succeeds. 

**T-006** As `finance` (Finance), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `engage_member` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `engage_member` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `engage_member` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `engage_member` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: an active engagement already exists for this party → expect `E_CONFLICT_UNIQUE`, message: 'This person is already engaged.'. offers the existing record

**T-018** Cause: the party is blocked → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

**T-019** Cause: engagement_kind is supplied_by_third_party with no supplying party → expect `E_VALIDATION`, message: 'Choose the supplying organisation.'.

**T-020** Cause: cost rate supplied without view_financial → expect `E_AUTHZ_FIELD`. the field is dropped and the creator is told which fields were not saved

**T-021** Cause: headcount limit reached → expect `E_QUOTA`, message: 'Plan limit reached.'.

**T-022** Cause: party_directory unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. engagement is blocked rather than proceeding with a dangling reference, because a member whose person cannot be resolved cannot be paid, contacted or identified

## Edge cases

**T-023** (EC-01) Engaging somebody who previously ended an engagement with this tenant. A new member row is created and the old one is retained. The new record shows the previous engagement and its rehire_eligible value prominently, because that is the fact the person engaging needs and it is exactly the fact a fresh record hides.

**T-024** (EC-02) Engaging somebody who is simultaneously engaged by a different tenant. Entirely legal and invisible - the two tenants cannot see each other. This means working-hour limits are enforceable only within one tenant, which is a real limitation with a safety dimension and is flagged in open_questions rather than papered over.

**T-025** (EC-03) Engagement with engaged_from in the future. The member sits in onboarding and does not become active until that date, and the onboarding stuck policy does not start its clock until then.

**T-026** (EC-04) Engaging with no mandatory qualifications defined at all. Activation succeeds immediately. This is correct for a tenant that has not configured any, and the surface says so rather than implying the person was checked.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
