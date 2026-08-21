---
doc_id: TEST-INVITE_PRINCIPAL
title: Test catalogue — Invite someone to the workspace
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Invite someone to the workspace

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `invite_principal` is invoked by an authorised actor, then the declared records are created/updated and events ['membership.invited'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `invite_principal` succeeds. 

**T-005** As `tenant_admin` (Tenant Administrator), invoking `invite_principal` succeeds. 

**T-006** As `finance` (Finance), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-008** As `supervisor` (Site Supervisor), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `invite_principal` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `invite_principal` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: identifier is neither a valid e164 phone nor a valid email → expect `E_VALIDATION`, message: 'Enter a mobile number with country code, or an email address.'.

**T-018** Cause: an ACTIVE membership already exists for this identifier in this tenant → expect `E_CONFLICT_UNIQUE`, message: 'This person is already in this workspace.'. distinct from the pending-invitation case, which is idempotent and silent

**T-019** Cause: seat quota reached → expect `E_QUOTA`, message: 'Plan limit reached.'. the count of consumed seats must state whether suspended memberships are included, because they are — see tenant_membership.suspended stuck policy

**T-020** Cause: inviter attempts to grant a role carrying archetypes they do not themselves hold → expect `E_AUTHZ_FIELD`. privilege escalation by invitation is the classic path; the role list presented is projected to roles the inviter could grant, and the server re-checks rather than trusting the client's list

**T-021** Cause: invitation channel provider unavailable → expect `E_DEPENDENCY`, message: 'The invitation is created but we could not send it yet.'. the membership row is committed and the send is queued and retried; a failed send never rolls back an onboarding batch

**T-022** Cause: more than invite_burst_limit invitations per tenant per hour (default 500) → expect `E_RATE_LIMIT`, message: 'Too many invitations at once.'. protects the shared messaging sender reputation, which is a platform-level asset one tenant can damage for every other tenant

## Edge cases

**T-023** (EC-01) The identifier already exists as a platform principal in another tenant. No new principal is created; a membership is added to the existing principal. The inviter is NOT told that the person exists elsewhere — that would disclose the existence of another tenant's user. The invitee, on accepting, sees a workspace picker rather than a signup form.

**T-024** (EC-02) The identifier belongs to a principal in status deactivated. Treated as unknown. A new principal row is created only if the identifier has passed its release cooling period; otherwise the invitation is refused with E_VALIDATION and a message that does not confirm the prior account's existence.

**T-025** (EC-03) Bulk invite of 200 rows where 3 are malformed. The 197 valid rows commit and the 3 are returned as a downloadable error file with the original row numbers. Verity never rolls back a whole import for a minority of bad rows, and never silently drops them.

**T-026** (EC-04) The inviting principal's own membership is revoked before the invitee accepts. The invitation remains valid; it is a tenant grant, not a personal one. The audit row retains the original inviter.

**T-027** (EC-05) Invitation sent to a phone number the invitee shares with a family member on a shared handset. Acceptance requires possession of the OTP AND setting a credential, and the accepted-by device fingerprint is recorded. This is a known and unresolved weakness of phone-as-identity in shared-handset households; see open_questions.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `security` is written with all fields required by that class (GAP) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
