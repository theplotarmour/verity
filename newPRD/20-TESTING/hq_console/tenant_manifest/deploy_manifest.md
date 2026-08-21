---
doc_id: TEST-DEPLOY_MANIFEST
title: Test catalogue — Change what a tenant is running
generated: true
source_model: _model/capabilities/hq_console.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Change what a tenant is running

*This document is generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `deploy_manifest` is invoked by an authorised actor, then the declared records are created/updated and events ['platform.manifest_deployed'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `deploy_manifest` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `deploy_manifest` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `deploy_manifest` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: broken overrides are not acknowledged → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. lists the tenant, the exact override and the change that broke it, per the composition model's upgrade semantics. They are never silently dropped

**T-018** Cause: the acceptance run did not pass and its failures were not accepted → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'.

**T-019** Cause: the tenant's current manifest changed since this one was generated → expect `E_CONFLICT_VERSION`, message: 'Someone else changed this record.'. regenerate against the current state. Deploying a manifest generated against a superseded one would silently revert whatever changed in between

**T-020** Cause: session not elevated → expect `E_AUTHN`, message: 'Confirm your identity to continue.'.

**T-021** Cause: the migration fails partway → expect `E_INTERNAL`. the manifest is marked failed, the tenant is left in a documented intermediate state rather than an unknown one, and platform_operator is paged. The platform does NOT attempt an automatic reverse migration, because DEC-K-011 is unresolved and an unproven reversal on live customer data is worse than a known intermediate state

**T-022** Cause: the tenant is suspended → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. permitted for a hotfix with an explicit override, because a suspended tenant may still need a security fix

## Edge cases

**T-023** (EC-01) A deployment that invalidates a tenant override. Blocked until acknowledged, listed with the exact override and the change that broke it, and the tenant is told after deployment which of their configurations no longer applies. Silently dropping an override is the failure the composition model explicitly forbids, and this is where that rule is enforced.

**T-024** (EC-02) A migration whose reversibility is unknown. The confirmation states unknown rather than implying either answer, and there is no rollback offered. This is DEC-K-011 arriving at the point where it actually bites, and the model refuses to imply a capability that has not been established.

**T-025** (EC-03) A deployment to a tenant whose device fleet is largely offline. Devices on the previous dataset version continue pushing already-queued mutations and cannot queue new ones, per the offline_sync degraded behaviour. The deployment does not wait for the fleet, and the count of devices that will degrade is shown in the confirmation.

**T-026** (EC-04) Deploying only labels, terminology or branding. Takes the immediate path with no staging, per the composition model. Forcing a colour change through a staging gate is how a team stops using the staging gate for the changes that need it.

**T-027** (EC-05) A deployment during a tenant's operating hours. Permitted, and the confirmation shows the tenant's local time and whether it is within their operating calendar. The model does not forbid it, because a security fix at three in the afternoon is sometimes correct, and it does make the operator see what they are doing.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
