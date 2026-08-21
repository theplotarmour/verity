---
doc_id: ACT-SEARCH-SAVE_SEARCH
title: Action — Save a search
generated: true
source_model: _model/capabilities/search.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Save a search

*This document is generated. Edit `_model/capabilities/search.yaml`, not this file.*

**Entity:** `saved_search` · **Capability:** `search`

## 1. Specification

### Who can perform it

- any_authenticated

### Preconditions

- the query executes successfully for the saving principal
- a label is supplied

### Inputs

- label
- term
- filters
- entity_keys
- shared_with_role_keys
- notify_on_new_results

### What is created

- saved_search

### What is modified

None.

### What events fire

- search.saved

### Who is notified

- **to**: holders of the sharing roles; **channel**: in_app; **when**: the search is shared; **template**: search_shared_with_you; **must_include**: ['label', 'author', 'that_it_runs_under_their_own_access']

### Can it be undone

Yes.

### Concurrency behaviour

Saved searches do not contend. Sharing grants the right to run, and the run resolves scope per runner, so there is no shared state to race on.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | label empty | Give it a name. | False |  |
| `E_AUTHZ_ENTITY` | 403 | sharing with a role the saver cannot themselves grant to | You cannot grant access you do not have. | False | sharing a search is not sharing data, and it is still restricted, because a shared search is a strong hint about what exists |
| `E_PRECONDITION` | 409 | notify_on_new_results requested while the notification port is unbound | This action is not available in the current state. | False | the search saves without the subscription rather than failing entirely |
| `E_QUOTA` | 402 | more than max_saved_searches per principal | Plan limit reached. | False |  |

## 3. Edge cases

**EC-01.** A search shared with a role whose holders have narrower scope. It runs under each runner's own scope and returns their results. This is the whole safety property, and the sharing notification says so explicitly, because the author will otherwise assume the recipient sees what they see.

**EC-02.** A saved search with a subscription whose result set grows enormously after a capability change. The growth alert fires before the notification volume arrives. Without it the first symptom is somebody receiving four hundred alerts.

**EC-03.** A saved search whose author leaves. Ownership transfers to a role rather than lapsing, where the search was shared; where it was private it is archived with its definition retained, because a private working set that vanishes silently is a loss nobody can reconstruct.

**EC-04.** Two principals saving identical searches. Both exist. Deduplicating across principals would mean one person's rename affects another's list.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/search/saved_search/save_search.md`.
