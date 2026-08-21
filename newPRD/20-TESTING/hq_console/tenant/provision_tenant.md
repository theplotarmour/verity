---
doc_id: TEST-PROVISION_TENANT
title: Test catalogue — Create a workspace
generated: true
source_model: _model/capabilities/hq_console.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Create a workspace

*This document is generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `provision_tenant` is invoked by an authorised actor, then the declared records are created/updated and events ['platform.tenant_provisioned'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `provision_tenant` succeeds. 

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-006** As `finance` (Finance), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `provision_tenant` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `provision_tenant` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: the key already exists → expect `E_CONFLICT_UNIQUE`, message: 'That workspace key is taken.'.

**T-018** Cause: an unsupported residency region → expect `E_VALIDATION`, message: 'field-specific'. immutable afterwards, so it is validated hard here. Changing it later is a migration with legal consequences

**T-019** Cause: the template references a withdrawn capability version → expect `E_PRECONDITION`, message: 'This action is not available in the current state.'. names the version, because provisioning onto a withdrawn version is how a new customer starts on a known defect

**T-020** Cause: manifest generation failed → expect `E_DEPENDENCY`. the whole provisioning rolls back. A tenant with no manifest is a tenant nobody can describe

**T-021** Cause: the platform region is at capacity → expect `E_QUOTA`, message: 'Plan limit reached.'. refused rather than provisioned into a different region, because residency is immutable and silently choosing a different one is a legal problem rather than an inconvenience

## Edge cases

**T-022** (EC-01) Provisioning from a system template. The template is a snapshot and not a live link, per the composition model, so the tenant does not track template updates. This is stated at provisioning time because the assumption otherwise is the reverse, and it is the source of the expectation that a template fix reaches existing tenants.

**T-023** (EC-02) Provisioning with an initial owner who never accepts. The workspace exists with no principal who can sign in, which the active-state monitor detects. The invitation expiry machinery in core_identity_session governs, and a workspace that reaches expiry with no owner is escalated rather than left.

**T-024** (EC-03) Two operators provisioning the same customer concurrently. The key uniqueness collapses them, which is why the key rather than the display name is the identity - two workspaces for one customer is a support problem that persists for years.

**T-025** (EC-04) Provisioning a trial that is never used. Detected by the trial silence monitor. This is a commercial signal living in a technical capability because it is the only place that knows whether anybody has signed in.

## Idempotency and concurrency

**T-026** Replaying the same request with the same idempotency key produces one effect and one event.

**T-027** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-028** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-029** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 29**
