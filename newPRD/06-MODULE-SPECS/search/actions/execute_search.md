---
doc_id: ACT-SEARCH-EXECUTE_SEARCH
title: Action — Search
generated: true
source_model: _model/capabilities/search.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Search

*This document is generated. Edit `_model/capabilities/search.yaml`, not this file.*

**Entity:** `search_query` · **Capability:** `search`

**Why this exists:** The most used surface in any operational product and the one most likely to leak. Its contract is that it is fast, that it says how stale it is, and that it never returns something the person cannot open.


## 1. Specification

### Who can perform it

- any_authenticated
- integration_principal

### Preconditions

- the principal is authenticated
- at least one projection is active for a requested entity

### Inputs

- term
- filters
- entity_keys
- surface
- cursor
- page_size

### What is created

- search_query

### What is modified

None.

### What events fire

None.

### Who is notified

None.

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Queries are reads against the index plus a re-check against a consistent authorization snapshot. A permission change between the index filter and the re-check causes the affected identifiers to be dropped from the result, which is correct and is why the re-check exists. The dropped count is recorded, and a persistently non-zero value is the signal that the index and the permission model have drifted.


### Audit class

read_sensitive_only

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHZ_SCOPE` | 404 | candidates fall outside the principal's scope | *(silent)* | False | they are omitted from the result set and from the count. The count must be projected too, because a total that includes invisible rows discloses how many exist |
| `E_VALIDATION` | 422 | the term is shorter than the minimum matchable length | *(silent)* | False | returns an empty result with the reason rather than scanning. A one-character term against every entity is a denial of service against the tenant's own index |
| `E_RATE_LIMIT` | 429 | export-shaped querying - repeated wide queries paginating deeply with a low selection rate | Too many attempts. Try again shortly. | True | this pattern is exfiltration wearing a search box, and the rate limit is the control. Legitimate bulk access is an export, which is separately gated and separately audited |
| `E_DEPENDENCY` | 424 | the authorization port is unavailable | A required service is unavailable. | True | FAILS CLOSED. No results are returned unchecked under any circumstance, including a partial outage |
| `E_DEPENDENCY` | 424 | the index is unavailable | *(silent)* | True | falls back to an exact-identifier lookup against the owning capabilities, which covers the most common real search - somebody typing a reference number - and states that only exact matches are available. A total failure would be worse than a narrow one |
| `E_QUOTA` | 402 | requested page depth exceeds max_result_depth | *(silent)* | False | deep pagination is the mechanism by which a search box becomes a bulk export, and the depth limit is the boundary between the two |

## 3. Edge cases

**EC-01.** A term matching content inside a gated field. The row must NOT appear. Matching on a field the principal cannot read turns the search box into an oracle for reading gated fields one guess at a time, and the gate_verb on every field projection exists precisely to make this checkable rather than incidental.

**EC-02.** A result count that would reveal how many records exist outside scope. Counts are projected exactly as rows are. Returning a total of 47 while showing 3 tells the searcher that 44 exist elsewhere, which is the same disclosure as showing them.

**EC-03.** Searching immediately after creating a record. The index lag is stated on the result set, and an exact-identifier lookup bypasses the index entirely. Somebody who has just created something and cannot find it concludes the product lost it, and the exact-lookup path exists for exactly that moment.

**EC-04.** A principal whose scope changed seconds ago. The index filter uses the old scope and the re-check uses the new one, so the result is correct and slower. This is the case the evidence_basis limitation names, and its cost is an open question rather than an assumed acceptable overhead.

**EC-05.** Searching by phone number where the number is a gated field on the party entity. Matchable only by principals holding the gate, and matched on a normalised form, because a number typed with spaces and a number stored in international form are the same number and a search that cannot see that is a search nobody uses twice.

**EC-06.** An integration principal searching. Permitted within its own scope, rate-limited more tightly than a human, and always audited, because a service account paginating a search surface is the single most efficient exfiltration path in the platform.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/search/search_query/execute_search.md`.
