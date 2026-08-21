---
doc_id: ACT-INTEGRATIONS-PROCESS_INBOUND
title: Action — Accept an inbound call
generated: true
source_model: _model/capabilities/integrations.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Accept an inbound call

*This document is generated. Edit `_model/capabilities/integrations.yaml`, not this file.*

**Entity:** `inbound_request` · **Capability:** `integrations`

**Why this exists:** The boundary where untrusted input enters. Authentication says who is calling; it says nothing about whether the payload is sane, and conflating the two is the most common integration security failure.


## 1. Specification

### Who can perform it

- integration_principal
- system

### Preconditions

- the request reached a configured endpoint
- the connection is active or degraded

### Inputs

- connection_hint
- headers
- signature
- body
- idempotency_key

### What is created

- inbound_request
- whatever the mapped action creates

### What is modified

- idempotency record

### What events fire

- integration.inbound_accepted
- integration.inbound_rejected

### Who is notified

- **to**: the connection owner; **channel**: in_app; **when**: the rejection rate crosses the alert threshold, or a quarantine begins; **template**: inbound_problem; **batching_policy**: one per connection per interval, with a sample

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The idempotency record is written under a unique constraint on the key before the mapped action runs, so two concurrent calls with one key produce one execution and the second waits for and receives the first's response. Doing the check after execution is the defect that produces two of everything under a caller's retry.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHN` | 401 | the signature does not verify | *(silent)* | False | rejected with no parsing and no processing. Verification precedes parsing, always, because parsing untrusted input before verifying it is the vulnerability |
| `E_AUTHZ_ENTITY` | 403 | the connection acting principal lacks permission for the mapped action | *(silent)* | False | rejected and recorded. An integration never has implicit authority, and a permission it lacks is a configuration error rather than a reason to bypass the check |
| `E_VALIDATION` | 422 | the payload does not match the mapping | *(silent)* | False | rejected and recorded with a bounded excerpt. Repeated identical failures trigger quarantine so one broken feed produces one conversation rather than ten thousand rejections |
| `E_CONFLICT_UNIQUE` | 409 | the idempotency key has been seen | *(silent)* | False | the stored response is replayed and the request is recorded as a duplicate. The caller sees exactly what they saw the first time |
| `E_RATE_LIMIT` | 429 | the caller exceeded the connection rate limit | *(silent)* | True | rejected with a retry-after. Verity states its own limits rather than silently queueing, because a caller that does not know it is being limited will simply send more |
| `E_INTERNAL` | 500 | the mapped action failed for an unexpected reason | *(silent)* | True | a 5xx is returned so the caller retries, AND the failure response is stored against the idempotency key so the retry converges rather than re-executing. Returning success on an internal failure is how data is silently lost at a boundary |

## 3. Edge cases

**EC-01.** A call arriving at an endpoint with no attributable connection. Recorded with connection_id null, rejected, and reported. This is either a misconfiguration or a probe, and both are worth seeing; discarding unattributable calls silently is how the first is never noticed.

**EC-02.** A caller retrying after a timeout where the original succeeded. The idempotency record replays the original response. Without the record the caller creates a duplicate of whatever the action was, which for an order or a payment is the expensive case.

**EC-03.** A caller that sends no idempotency key and no event identifier. Deduplicated on a payload hash within a short window, which is weaker and is stated as weaker on the connection's own surface, so the tenant knows the guarantee they actually have with that far side.

**EC-04.** A burst of identical validation failures - a far side that changed its format. Quarantine after the burst threshold, with a sample shown to the owner. Processing every one of ten thousand identical failures generates ten thousand audit rows and one very unhappy operator.

**EC-05.** An inbound call that would create a record the acting principal could see but not create. Rejected on the create check. The permission model is evaluated in full for an integration exactly as for a person, which is the point of giving the connection a principal rather than a bypass.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/integrations/inbound_request/process_inbound.md`.
