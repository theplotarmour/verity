---
doc_id: ACT-OFFLINE_SYNC-PULL_DATASET
title: Action — Refresh what the device holds
generated: true
source_model: _model/capabilities/offline_sync.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Refresh what the device holds

*This document is generated. Edit `_model/capabilities/offline_sync.yaml`, not this file.*

**Entity:** `device_store` · **Capability:** `offline_sync`

**Why this exists:** The local dataset is what makes work possible with no signal. Its scope, its freshness and its size are the three variables that decide whether a field application is usable, and all three are modelled rather than left to a client implementation.


## 1. Specification

### Who can perform it

- the device

### Preconditions

- the store is not blocked
- the principal is active
- the app version is supported for pull

### Inputs

- device_store_id
- since_cursor
- requested_scope

### What is created

None.

### What is modified

- last_pull_at
- dataset_version
- scope_expression
- storage_used_bytes

### What events fire

- sync.pulled

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Pull is a cursored read against a consistent snapshot. A permission change mid-pull does not produce a partially widened dataset; the cursor carries the scope fingerprint and a change invalidates the cursor, forcing the next page to be fetched under the new scope. This matters because the alternative is a device that ends a pull holding a mixture of two permission states.


### Audit class

read_sensitive_only

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHZ_SCOPE` | 404 | the requested scope exceeds the principal's live permission | *(silent)* | False | the scope is NARROWED server-side to what the principal may see and the narrowing is reported to the device, which then deletes what it may no longer hold. A client never widens its own scope |
| `E_PRECONDITION` | 409 | the dataset version has changed incompatibly | *(silent)* | False | a full resync is required and is offered as such. A device silently mixing two schema versions produces mutations the server cannot interpret |
| `E_QUOTA` | 402 | the dataset exceeds the device storage limit | *(silent)* | False | the scope is reduced by the declared priority order - assignments for today before history - and the reduction is reported. A pull that simply fails leaves the device with nothing |
| `E_RATE_LIMIT` | 429 | a device pulling far more often than its data changes | *(silent)* | True | throttled. Usually a client defect and the person holding the device can do nothing about it |
| `E_DEPENDENCY` | 424 | the authorization service is unavailable | *(silent)* | True | the pull is REFUSED. Serving a dataset without resolving the scope would mean guessing what somebody may see, and the safe guess is nothing, which is the same as refusing |

## 3. Edge cases

**EC-01.** A principal whose scope narrows while their device is offline. The narrowing takes effect at the next pull, and the device deletes what it may no longer hold. Between the change and the next contact the device holds data the principal can no longer see, bounded by offline_grace_hours, and that exposure is stated in the security model rather than pretended away.

**EC-02.** A shared device with several principals' stores. Each store pulls under its own principal's scope and they never merge. The device shows only the signed-in principal's store, and switching principals does not carry data across.

**EC-03.** An initial pull at a location with poor connectivity - the characteristic provisioning failure. The dataset is delivered in priority order so that a partial pull is still usable, and the store reports which priorities it holds. A device with today's assignments and no history is far more useful than one with nothing.

**EC-04.** A pull that would exceed storage. Reduced by priority rather than failed, and the reduction is visible to the person. A field application that silently holds less than the person expects is one they stop trusting the first time something is missing.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/offline_sync/device_store/pull_dataset.md`.
