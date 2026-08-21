---
doc_id: TEST-EVALUATE_PERMISSION
title: Test catalogue — Evaluate a permission decision
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Evaluate a permission decision

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `evaluate_permission` is invoked by an authorised actor, then the declared records are created/updated and events [] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `evaluate_permission` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `evaluate_permission` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `evaluate_permission` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: no grant for this verb on this entity in any bound role → expect `E_AUTHZ_ENTITY`, message: 'You do not have access to this record type.'. safe to be specific here - the entity type is not secret, only the records are

**T-018** Cause: grant exists but the subject is outside every bound scope → expect `E_AUTHZ_SCOPE`, message: 'Not found.'. deliberately 404. The response must also be timing-indistinguishable from a genuine miss, which means the scope check must not short-circuit before the existence check in a way an attacker can measure

**T-019** Cause: requested field is gated by view_financial or view_sensitive and the principal holds neither → expect `E_AUTHZ_FIELD`. the field is omitted from the payload; the response is 200

**T-020** Cause: a condition_expression evaluated to neither true nor false - null propagation, missing context, or a traversal the principal cannot perform → expect `E_INTERNAL`, message: 'Something went wrong. The team has been notified.'. FAILS CLOSED. Kernel K16 mandates explicit three-valued logic. Treating unknown as false would silently deny; treating it as true would silently permit. Neither is acceptable, so the request fails and somebody is told

**T-021** Cause: org_structure port bound but unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. FAILS CLOSED. A scope that cannot be resolved denies. The alternative - falling back to a wider scope - is a privilege escalation triggered by an outage

**T-022** Cause: a single principal generating more than evaluation_rate_limit decisions per minute → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. this limit exists to catch a runaway integration, and it is deliberately generous; a human cannot reach it

## Edge cases

**T-023** (EC-01) Two roles grant the same verb at different scopes. The result is the UNION of the scopes, never the intersection. Intersection would make adding a role able to reduce access, which no administrator expects.

**T-024** (EC-02) One role allows and another denies the same verb. DENY wins, evaluated last. This is the only non-additive rule and it is stated in the kernel rather than being configurable.

**T-025** (EC-03) A DENY grant at a narrower scope than an ALLOW. The deny applies only within its own scope. A deny on own_site does not cancel an allow at tenant scope outside that location.

**T-026** (EC-04) The principal holds no bindings at all. Every entity check denies. The surface shows an explicit "no access has been granted to you yet" state naming who to contact, not an empty dashboard, because an empty dashboard reads as a broken product.

**T-027** (EC-05) A subject that does not exist and a subject outside scope must be indistinguishable in status code, body and response time. This is tested explicitly, not assumed, because the natural implementation - look up, then check scope - leaks existence through timing.

**T-028** (EC-06) Evaluation during an impersonated session uses the impersonated principal's permissions, intersected with any redaction the impersonation grant carries. A platform_support impersonation redacts financial fields even where the impersonated principal could read them, so support cannot see a customer's margins.

**T-029** (EC-07) A grant referencing a capability that is currently disabled in the tenant manifest evaluates to deny, not to error. Disabling a capability must not produce 500s across the console.

## Idempotency and concurrency

**T-030** Replaying the same request with the same idempotency key produces one effect and one event.

**T-031** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-032** An audit row of class `read_sensitive_only` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-033** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 33**
