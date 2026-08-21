---
doc_id: ACT-PARTY-RECORD_CONSENT
title: Action — Record consent for a channel
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Record consent for a channel

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

**Entity:** `party_channel` · **Capability:** `party`

**Why this exists:** Consent is the difference between a notification and a complaint. Recording it as a first-class act with evidence, rather than as a checkbox on a form, is what makes it defensible later.


## 1. Specification

### Who can perform it

- tenant_admin
- ops_manager
- supervisor
- employee
- integration_principal

### Preconditions

- the channel exists
- the purpose is one of marketing or transactional
- evidence is supplied where the grant is for marketing

### Inputs

- channel_id
- purpose
- decision
- evidence_ref
- recorded_at
- source_description

### What is created

- consent_record

### What is modified

- party_channel.consent_marketing or consent_transactional
- consent_recorded_at
- consent_evidence_ref

### What events fire

- party.consent_recorded

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Consent is a monotonic ratchet toward the most restrictive value within a single recorded_at ordering. A withdrawal recorded at 10:00 and a grant recorded at 09:00 arriving out of order resolve to the withdrawal, because the resolution is by recorded_at and not by arrival. This is one of the few places where last-write-wins would be actively harmful.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | marketing grant with no evidence_ref while the evidence_capture port is bound | Record how consent was given. | False | the one case where the model refuses rather than storing a weaker record |
| `E_PRECONDITION` | 409 | granting consent on a channel suppressed by an explicit opt-out | This person opted out on this channel. They have to opt back in themselves. | False | staff may not re-grant on behalf of somebody who opted out directly |
| `E_VALIDATION` | 422 | recorded_at in the future | The date cannot be in the future. | False |  |
| `E_DEPENDENCY` | 424 | evidence_capture unavailable | A required service is unavailable. | True | a marketing grant is refused; a refusal or withdrawal is accepted without evidence, because refusing to record a withdrawal because a service is down is indefensible |

## 3. Edge cases

**EC-01.** Consent recorded for a party who is later merged. Consent travels to the survivor at the CHANNEL level, not the party level, and the most restrictive value across merged channels with the same normalised value wins. Merging must never launder a refusal into a grant.

**EC-02.** A party grants marketing consent and later the channel is reassigned - a recycled phone number. Verification state is invalidated on any value change, which also resets consent to unknown, because consent attaches to a person and not to a string.

**EC-03.** Withdrawal of transactional consent on the only channel of a party with an active obligation. Recorded, and the obligation-owning capability is notified through the party_directory port that the party has become uncontactable. Verity does not refuse the withdrawal - it is not the tenant's to refuse - but it does not let the consequence go unnoticed either.

**EC-04.** Consent arriving from an integration whose source cannot be evidenced. Recorded with verification_method=none and marked as unevidenced. It counts for refusals and withdrawals and does not count as a marketing grant.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/party/party_channel/record_consent.md`.
