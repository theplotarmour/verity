---
doc_id: TEST-ADD_GRANT
title: Test catalogue — Add a permission to a role
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Add a permission to a role

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `add_grant` is invoked by an authorised actor, then the declared records are created/updated and events ['permission.granted'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `add_grant` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `add_grant` succeeds. 

**T-006** As `finance` (Finance), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `add_grant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `add_grant` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the granter does not themselves hold this verb at this scope → expect `E_AUTHZ_ENTITY`, message: 'You cannot grant access you do not have.'. no-privilege-escalation is the load-bearing rule of this entire capability. It is checked against the granter's permissions at request time, not against their archetype, because archetypes are a labelling convenience and permissions are the truth

**T-018** Cause: field_set_mode explicit with empty field_list → expect `E_VALIDATION`, message: 'Choose at least one field.'.

**T-019** Cause: condition_expression fails static analysis - unknown identifier, exceeds the cost ceiling, or traverses a relationship the grantee could not traverse → expect `E_VALIDATION`, message: 'field-specific'. rejected at save time rather than timing out at runtime, per kernel K16. The error names the offending token and the ceiling that was exceeded

**T-020** Cause: role is is_system → expect `E_PRECONDITION`, message: 'System roles cannot be edited. Clone it first.'.

**T-021** Cause: scope=platform requested by a tenant-bound principal → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. deliberately vague. A specific message would teach a tenant administrator that a cross-tenant scope exists

**T-022** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

## Edge cases

**T-023** (EC-01) Adding a DENY grant that makes an existing ALLOW unreachable. Permitted, and the UI shows which existing grants it neutralises before saving. Refusing would be wrong - carving out is exactly what deny is for - but doing it silently produces a role nobody can reason about.

**T-024** (EC-02) Adding a grant to a role bound to the acting principal themselves. Permitted, and separately flagged in the audit stream as a self-grant, because self-granting is legitimate for an owner and is the first thing an investigator looks for.

**T-025** (EC-03) A grant referencing an entity that a later capability upgrade removes. Reported as a BROKEN override, blocks the upgrade in staging, and lists the tenant, the exact grant and the change that broke it. Never silently dropped - the composition model is explicit about this.

**T-026** (EC-04) Adding a grant while a bulk permission import is running. The import takes an advisory lock per role; the interactive add waits rather than interleaving, because a half-applied permission set is a security state nobody has reasoned about.

## Idempotency and concurrency

**T-027** Replaying the same request with the same idempotency key produces one effect and one event.

**T-028** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-029** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-030** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 30**
