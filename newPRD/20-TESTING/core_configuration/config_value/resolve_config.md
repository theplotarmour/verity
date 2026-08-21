---
doc_id: TEST-RESOLVE_CONFIG
title: Test catalogue — Resolve a setting for a principal
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Resolve a setting for a principal

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `resolve_config` is invoked by an authorised actor, then the declared records are created/updated and events [] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `resolve_config` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `resolve_config` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `resolve_config` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: unknown config_key → expect `E_VALIDATION`. a programming error, not a user error. Raised to platform_operator. Deliberately NOT resolved to a fallback default, because a typo in a key silently resolving to something plausible is how a feature ships doing nothing

**T-018** Cause: the definition is retired → expect `E_PRECONDITION`. as above

**T-019** Cause: org_structure unavailable and a site-scoped value exists → expect `E_DEPENDENCY`. resolution FAILS rather than falling back to the tenant value. Falling back would silently apply a different setting than the one configured, and for a setting like an SLA target or a geofence radius that is a materially different product

## Edge cases

**T-020** (EC-01) Two role-scoped values apply because the principal holds two roles. This is the one place precedence is genuinely ambiguous, and it is resolved by a declared tiebreak - the role with the lower role_precedence_rank wins, and rank is mandatory on every role. It is NOT resolved by picking the more permissive value, because "more permissive" is undefined for a setting like a session timeout where lower is stricter and for a geofence radius where lower is also stricter but for a page size neither is.

**T-021** (EC-02) A null value at a narrow scope where a non-null value exists at a wider scope. Null WINS if the definition declares nullable_meaning, because setting something to null is an act. If the definition does not declare nullable_meaning, null at any scope is rejected at write time and so cannot occur here.

**T-022** (EC-03) The offline client resolving a value it cached before a change. It uses the cached value and the surface shows the cache age. It does not guess. Any action whose behaviour depends on a setting with change_impact requires_migration is refused offline outright.

**T-023** (EC-04) A pack_default value and a tenant value both exist. Tenant wins, and the surface shows the pack value as the thing being overridden, so an administrator can see what the pack intended.

**T-024** (EC-05) Resolution for an integration_principal, which has no site and no user scope. Only pack_default, tenant and role apply. A service account inheriting a human's user-scoped preference would be a subtle and untraceable behaviour change.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `read_sensitive_only` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
