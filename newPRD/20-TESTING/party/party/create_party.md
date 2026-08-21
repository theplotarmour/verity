---
doc_id: TEST-CREATE_PARTY
title: Test catalogue — Add a party
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Test catalogue — Add a party

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

## Happy path

**T-001** Given all preconditions satisfied, when `create_party` is invoked by an authorised actor, then the declared records are created/updated and events ['party.created', 'party_relationship.created'] are emitted exactly once per `event_id`.

## Authorization

**T-002** As `platform_operator` (Platform Operator (Verity HQ)), invoking `create_party` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-003** As `platform_support` (Platform Support (Verity HQ)), invoking `create_party` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-004** As `tenant_owner` (Owner / Director), invoking `create_party` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-005** As `tenant_admin` (Tenant Administrator), invoking `create_party` succeeds. 

**T-006** As `finance` (Finance), invoking `create_party` succeeds. 

**T-007** As `ops_manager` (Operations / Area Manager), invoking `create_party` succeeds. 

**T-008** As `supervisor` (Site Supervisor), invoking `create_party` succeeds. 

**T-009** As `dispatcher` (Dispatcher / Scheduler), invoking `create_party` succeeds. 

**T-010** As `employee` (Employee / Field Worker / Guard / Technician), invoking `create_party` succeeds. 

**T-011** As `customer_contact` (Client Contact (B2B)), invoking `create_party` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-012** As `consumer` (Consumer (B2C)), invoking `create_party` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-013** As `vendor_contact` (Vendor / Supplier Contact), invoking `create_party` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-014** As `auditor` (Auditor), invoking `create_party` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

**T-015** As `integration_principal` (Integration / Service Account), invoking `create_party` is denied. Denial must use the code required by the scope/entity layer, and must not leak record existence.

## Tenant isolation

**T-016** A principal in tenant A invoking `create_party` against a subject id belonging to tenant B receives `E_AUTHZ_SCOPE` (404). Verified at the database layer with RLS enabled and the application predicate deliberately removed.

## Failure modes

**T-017** Cause: display_name empty → expect `E_VALIDATION`, message: 'A name is required.'.

**T-018** Cause: tax_registration_id already belongs to another active party → expect `E_CONFLICT_UNIQUE`, message: 'Another record already uses this registration number.'. names the existing party if the creator can see it, and says only that it exists if they cannot. This is the one duplicate check that is exact rather than fuzzy, and it is enforced rather than proposed

**T-019** Cause: a channel value fails normalisation for its kind → expect `E_VALIDATION`, message: 'field-specific'. a phone number that cannot be normalised to e164 is refused rather than stored raw, because an unnormalised number defeats both duplicate detection and every send

**T-020** Cause: the creator sets a financial field without view_financial → expect `E_AUTHZ_FIELD`. the field is dropped from the request rather than the request being refused, and the creator is told which fields were not saved

**T-021** Cause: tenant party limit reached → expect `E_QUOTA`, message: 'Plan limit reached.'.

**T-022** Cause: more than party_create_burst per principal per minute → expect `E_RATE_LIMIT`, message: 'Too many attempts. Try again shortly.'. catches a runaway import running through the interactive API rather than the import path

## Edge cases

**T-023** (EC-01) Created offline and queued. The duplicate check runs on replay, not on the device, because the device holds a partial copy of the party set and a duplicate check against a partial set produces confident wrong answers. The creating person is told about proposals raised on their behalf when they next connect.

**T-024** (EC-02) A party created by portal self-registration. It arrives in draft with source=portal_self_registration and never auto-activates, because a self-registered party is an unverified claim. Activation is a staff act.

**T-025** (EC-03) Two parties with the same display_name and nothing else in common. Extremely common with generic organisation names. The duplicate rule set must not score name-only matches highly enough to propose, and the shipped default does not; this is called out because the naive rule set does and produces an unusable queue on day one.

**T-026** (EC-04) A party created with a channel that is already suppressed on a different party. The channel is created unverified and the suppression is NOT inherited, because suppression attaches to the party-channel pair. It is flagged on the duplicate proposal, since a shared suppressed channel is strong evidence of a duplicate.

**T-027** (EC-05) Creating a party while the financial_document_sink port is unbound and later binding it. Existing parties are not retrospectively invalid; they are listed as missing required attributes at the moment a document is first attempted, which is when the information is actually needed and when somebody is present to supply it.

## Idempotency and concurrency

**T-028** Replaying the same request with the same idempotency key produces one effect and one event.

**T-029** Two concurrent invocations against the same subject: exactly one succeeds or both succeed per the declared concurrency rule; no lost update; optimistic version conflict surfaces as `E_CONFLICT_VERSION` with a diff.

## Audit

**T-030** An audit row of class `always` is written with all fields required by that class (actor, action, entity, entity_id, before, after, reason, source, ip, device, geo_if_captured, correlation_id, occurred_at) and is not mutable afterwards.

## Offline

**T-031** Invoked offline: queued or refused per the offline policy; on reconnect the outcome matches the online outcome or surfaces `E_OFFLINE_STALE` with a resolvable conflict.


**Total generated cases: 31**
