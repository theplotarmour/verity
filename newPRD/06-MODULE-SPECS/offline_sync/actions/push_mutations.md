---
doc_id: ACT-OFFLINE_SYNC-PUSH_MUTATIONS
title: Action — Send queued work
generated: true
source_model: _model/capabilities/offline_sync.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Send queued work

*This document is generated. Edit `_model/capabilities/offline_sync.yaml`, not this file.*

**Entity:** `queued_mutation` · **Capability:** `offline_sync`

**Why this exists:** The moment somebody's work becomes real. Order, attribution, atomicity and idempotency all have to hold simultaneously, and each of them is a place where a naive implementation quietly loses or duplicates work.


## 1. Specification

### Who can perform it

- the device

### Preconditions

- the store is not blocked
- the dataset version is compatible for push
- connectivity exists

### Inputs

- device_store_id
- mutations
- evidence_items

### What is created

None.

### What is modified

- mutation states
- last_push_at
- queued counts

### What events fire

- sync.pushed

### Who is notified

- **to**: the acting principal; **channel**: device_surface; **when**: any mutation is rejected or conflicted; **template**: work_needs_attention; **must_include**: ['what_it_was', 'why']; **mandatory_operational**: True

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Mutations from one device store replay strictly in sequence_in_device order, and a mutation that conflicts or is rejected HALTS that store's replay by default rather than being skipped. Skipping ahead applies later work against a state the person never saw and is how one conflict silently corrupts five subsequent records. Different stores replay independently, so one device's conflict never blocks another's.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_VERSION` | 409 | the subject changed since base_version | *(silent)* | True | a conflict is raised and the mutation is HELD with its evidence. It is never discarded and never force-applied |
| `E_AUTHZ_ENTITY` | 403 | the acting principal no longer holds the permission the action requires | *(silent)* | False | REJECTED, not applied. Permission is re-evaluated at replay rather than trusted from queue time, which is what stops work queued before a revocation from applying after it |
| `E_PRECONDITION` | 409 | the subject no longer exists or has moved to a state that forbids the action | *(silent)* | False | rejected and held. The most common instance is a completion for a work order cancelled while the device was offline, and the correct outcome is that a person sees it and decides, because the work was done |
| `E_VALIDATION` | 422 | the payload fails validation against the current schema | *(silent)* | False | rejected and held with the specific validation error rendered for the person rather than for a log |
| `E_PRECONDITION` | 409 | an atomic group is incomplete because one member's evidence has not uploaded | *(silent)* | False | the whole group waits rather than partially applying. A completion applied without its stock movements is the failure this grouping exists to prevent |
| `E_PRECONDITION` | 409 | the mutation is for a financial or permission-affecting action | *(silent)* | False | REJECTED and raised as a security finding against the client. The kernel forbids it and the server enforces it independently of the client, because a client that produced one is a client that cannot be trusted to enforce it |
| `E_TENANT_SUSPENDED` | 423 | the tenant was suspended while the device was offline | *(silent)* | False | the push is refused and the queue is retained intact. Work is never discarded because of a billing state |

## 3. Edge cases

**EC-01.** A device offline for a fortnight pushing several hundred mutations. Replayed in order, oldest first, with the store's replay halting at the first unresolvable conflict. The person is shown one conflict at a time in the order they created the work, which is the only order in which their own decisions make sense to them.

**EC-02.** A completion whose work order was cancelled offline. Rejected and held. The work was done and the record of it is the only evidence; discarding it because the record was cancelled destroys the one thing that would let somebody be paid for it.

**EC-03.** Two devices holding conflicting offline edits to the same record. Whichever arrives first applies; the second conflicts and both versions are retained. Neither is privileged by being first, and the conflict record names both people so they can speak to each other.

**EC-04.** Attribution at replay. Every applied mutation is attributed to acting_principal_id and to occurred_at, never to whoever synced it or to the moment of arrival. A supervisor who plugs in a technician's handset must not appear as the author of a week of work.

**EC-05.** A mutation carrying an occurred_at in the future because the device clock is wrong. Applied with the claimed time retained and the skew recorded. Never silently corrected, because the skew is the only evidence that the timestamp is unreliable, and corrected timestamps make an offline dispute unwinnable for the person holding the device.

**EC-06.** A push interrupted by connectivity loss halfway through. Resumed from the last acknowledged sequence. The idempotency keys make re-sending the boundary mutations harmless, which is why they are carried through to the server actions rather than being a transport-level concern.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/offline_sync/queued_mutation/push_mutations.md`.
