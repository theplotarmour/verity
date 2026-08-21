---
doc_id: ACT-PARTY-CREATE_PARTY
title: Action — Add a party
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Add a party

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

**Entity:** `party` · **Capability:** `party`

**Why this exists:** Deliberately broadly permitted. A capability that only administrators may add records to gets bypassed by a spreadsheet within a week, and the spreadsheet becomes the real system of record.


## 1. Specification

### Who can perform it

- tenant_admin
- ops_manager
- supervisor
- dispatcher
- finance
- employee

### Preconditions

- the tenant is not suspended
- at least display_name is supplied

### Inputs

- kind
- display_name
- legal_name
- channels
- tax_registration_kind
- tax_registration_id
- relationship_kind
- source

### What is created

- party
- party_channel rows
- party_relationship
- merge_proposal rows where duplicates are detected

### What is modified

None.

### What events fire

- party.created
- party_relationship.created

### Who is notified

- **to**: tenant_admin; **channel**: in_app; **when**: a duplicate proposal was raised at creation; **template**: possible_duplicate; **batching_policy**: one digest per hour; **cost_class**: free_in_service_window

### Can it be undone

Yes.

### Concurrency behaviour

Two people creating the same party concurrently both succeed and a merge proposal is raised. Blocking the second write would require a synchronous duplicate check against a fuzzy rule set, which cannot be made both fast and correct. Verity chooses to let both exist and to surface the duplicate, because a refused write loses the second person's information entirely.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | display_name empty | A name is required. | False |  |
| `E_CONFLICT_UNIQUE` | 409 | tax_registration_id already belongs to another active party | Another record already uses this registration number. | False | names the existing party if the creator can see it, and says only that it exists if they cannot. This is the one duplicate check that is exact rather than fuzzy, and it is enforced rather than proposed |
| `E_VALIDATION` | 422 | a channel value fails normalisation for its kind | field-specific | False | a phone number that cannot be normalised to e164 is refused rather than stored raw, because an unnormalised number defeats both duplicate detection and every send |
| `E_AUTHZ_FIELD` | 200 | the creator sets a financial field without view_financial | *(silent)* | False | the field is dropped from the request rather than the request being refused, and the creator is told which fields were not saved |
| `E_QUOTA` | 402 | tenant party limit reached | Plan limit reached. | False |  |
| `E_RATE_LIMIT` | 429 | more than party_create_burst per principal per minute | Too many attempts. Try again shortly. | True | catches a runaway import running through the interactive API rather than the import path |

## 3. Edge cases

**EC-01.** Created offline and queued. The duplicate check runs on replay, not on the device, because the device holds a partial copy of the party set and a duplicate check against a partial set produces confident wrong answers. The creating person is told about proposals raised on their behalf when they next connect.

**EC-02.** A party created by portal self-registration. It arrives in draft with source=portal_self_registration and never auto-activates, because a self-registered party is an unverified claim. Activation is a staff act.

**EC-03.** Two parties with the same display_name and nothing else in common. Extremely common with generic organisation names. The duplicate rule set must not score name-only matches highly enough to propose, and the shipped default does not; this is called out because the naive rule set does and produces an unusable queue on day one.

**EC-04.** A party created with a channel that is already suppressed on a different party. The channel is created unverified and the suppression is NOT inherited, because suppression attaches to the party-channel pair. It is flagged on the duplicate proposal, since a shared suppressed channel is strong evidence of a duplicate.

**EC-05.** Creating a party while the financial_document_sink port is unbound and later binding it. Existing parties are not retrospectively invalid; they are listed as missing required attributes at the moment a document is first attempted, which is when the information is actually needed and when somebody is present to supply it.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/party/party/create_party.md`.
