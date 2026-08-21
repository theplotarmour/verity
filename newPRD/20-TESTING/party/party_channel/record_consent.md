---
doc_id: TEST-RECORD_CONSENT
title: Test catalogue — Record consent for a channel
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Record consent for a channel

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `record_consent` is invoked by an authorised actor, then the declared records are created/updated and events ['party.consent_recorded'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `record_consent` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `record_consent` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `record_consent` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `record_consent` succeeds. 

**T-006** As `finance` (Finance), invoking `record_consent` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-007** As `ops_manager` (Operations / Area Manager), invoking `record_consent` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `record_consent` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `record_consent` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `record_consent` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `record_consent` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `record_consent` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `record_consent` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `record_consent` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `record_consent` succeeds. 

## Tenant isolation

**T-016** A principal in tenant A invoking `record_consent` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: marketing grant with no evidence_ref while the evidence_capture port is bound → expect `E_VALIDATION`, message: 'Record how consent was given.'. the one case where the model refuses rather than storing a weaker record

**T-018** Cause: granting consent on a channel suppressed by an explicit opt-out → expect `E_PRECONDITION`, message: 'This person opted out on this channel. They have to opt back in themselves.'. staff may not re-grant on behalf of somebody who opted out directly

**T-019** Cause: recorded_at in the future → expect `E_VALIDATION`, message: 'The date cannot be in the future.'.

**T-020** Cause: evidence_capture unavailable → expect `E_DEPENDENCY`, message: 'A required service is unavailable.'. a marketing grant is refused; a refusal or withdrawal is accepted without evidence, because refusing to record a withdrawal because a service is down is indefensible

## Edge cases

**T-021** (EC-01) Consent recorded for a party who is later merged. Consent travels to the survivor at the CHANNEL level, not the party level, and the most restrictive value across merged channels with the same normalised value wins. Merging must never launder a refusal into a grant.

**T-022** (EC-02) A party grants marketing consent and later the channel is reassigned - a recycled phone number. Verification state is invalidated on any value change, which also resets consent to unknown, because consent attaches to a person and not to a string.

**T-023** (EC-03) Withdrawal of transactional consent on the only channel of a party with an active obligation. Recorded, and the obligation-owning capability is notified through the party_directory port that the party has become uncontactable. Verity does not refuse the withdrawal - it is not the tenant's to refuse - but it does not let the consequence go unnoticed either.

**T-024** (EC-04) Consent arriving from an integration whose source cannot be evidenced. Recorded with verification_method=none and marked as unevidenced. It counts for refusals and withdrawals and does not count as a marketing grant.

## Idempotency and concurrency

**T-025** Replaying the same request with the same idempotency key produces one effect and one event.

**T-026** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-027** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-028** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 28**
