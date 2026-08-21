---
doc_id: ACT-BACKFILL_DISPATCH-RANK_CANDIDATES
title: Action — Rank who to ask
generated: true
source_model: _model/capabilities/backfill_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Rank who to ask

*This document is generated. Edit `_model/capabilities/backfill_dispatch.yaml`, not this file.*

**Entity:** `backfill_offer` · **Capability:** `backfill_dispatch`

**Why this exists:** The ranking is the product. It must be fast, explainable and unsurprising, and it must degrade honestly when a factor is unavailable rather than silently dropping it.


## 1. Specification

### Who can perform it

- system
- dispatcher

### Preconditions

- the request is in state raised
- searching or escalated
- the resource provider is reachable

### Inputs

- request_id
- tier
- exclude_resource_refs

### What is created

- a ranked candidate list recorded against the request

### What is modified

- request state

### What events fire

- backfill.candidates_ranked

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

Ranking is a pure computation over a snapshot of candidate availability. Two concurrent rankings produce the same list. Availability changing between ranking and offering is expected and is handled at offer time rather than by locking candidates, because locking candidates during a search is how one absence becomes two.


### Audit class

read_sensitive_only

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_DEPENDENCY` | 424 | the resource provider is unavailable | *(silent)* | True | the request stays in raised and the ranking retries with backoff. It does NOT fall back to an unranked list of everybody, which would page an entire workforce for one gap |
| `E_PRECONDITION` | 409 | the ranking returns no candidates at this tier | *(silent)* | False | an outcome, not an error. It escalates immediately rather than consuming the tier's time budget waiting for offers that cannot be made |
| `E_DEPENDENCY` | 424 | org_structure unavailable so distance cannot be computed | *(silent)* | True | ranking proceeds without the distance factor and every offer records that distance was unavailable. A ranking that silently drops a factor is one nobody can audit |
| `E_QUOTA` | 402 | the candidate pool exceeds max_ranked_candidates | *(silent)* | False | truncated at the limit with the truncation recorded. An unbounded ranking on a large workforce is slow at exactly the moment speed matters most |

## 3. Edge cases

**EC-01.** A candidate who is the absent person. Always excluded. Backfilling somebody with themselves is a data error that looks like a resolution.

**EC-02.** A candidate whose acceptance would breach a working-hour limit. Excluded from the ranking rather than offered and refused at acceptance, because an offer that cannot be accepted wastes the candidate's attention and the request's lead time. The exclusion is recorded in the factors so a dispatcher can see who was skipped and why.

**EC-03.** Every candidate at a tier has already declined at a previous tier. They are not re-offered within the same request unless the tier explicitly permits re-asking with a premium, which is a configured behaviour rather than a default. Re-asking somebody who already said no, with nothing changed, is how people stop reading offers.

**EC-04.** Ranking during a widespread disruption when most of the workforce is unavailable. The empty-list outcome fires immediately at tier 0 and escalates to a human. This is the case the capability most needs to handle well, because it is exactly when the automatic path is least useful.

**EC-05.** A tenant with a small workforce where the ranking is trivially the whole list. Fully supported, and the tier structure still governs timing and premium. The capability's value at that size is the timing and the record, not the ranking.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/backfill_dispatch/backfill_offer/rank_candidates.md`.
