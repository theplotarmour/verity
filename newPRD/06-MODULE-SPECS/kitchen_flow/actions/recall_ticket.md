---
doc_id: ACT-KITCHEN_FLOW-RECALL_TICKET
title: Action — Send work back
generated: true
source_model: _model/capabilities/kitchen_flow.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Send work back

*This document is generated. Edit `_model/capabilities/kitchen_flow.yaml`, not this file.*

**Entity:** `preparation_ticket` · **Capability:** `kitchen_flow`

**Why this exists:** Work that has to be redone is the most useful quality signal a preparation operation produces. Modelling it as a linked successor rather than as a cancellation and a new request is what makes the recall rate measurable at all.


## 1. Specification

### Who can perform it

- employee
- supervisor
- integration_principal

### Preconditions

- the ticket is ready or collected
- a recall reason from the configured list is chosen

### Inputs

- ticket_id
- reason_key
- reason_note
- affected_line_refs
- evidence_ref

### What is created

- a new preparation_ticket with recall_of_ticket_id set
- and its steps

### What is modified

- the original's recall_count
- the original's state

### What events fire

- preparation.recalled

### Who is notified

- **to**: the stations that prepared the affected lines; **channel**: display; **when**: always; **template**: work_recalled; **must_include**: ['display_reference', 'reason', 'affected_lines']; **priority**: high; **mandatory_operational**: True
- **to**: the location supervisor; **channel**: floor_surface; **when**: always; **template**: recall_recorded
- **to**: ops_manager; **channel**: in_app; **when**: the recall chain exceeds recall_chain_alert; **template**: repeated_recall; **priority**: high

### Can it be undone

Yes.

### Concurrency behaviour

The original is locked while recall_count is incremented and the successor created, so two concurrent recalls produce one successor. Two recalls of one request is two pieces of replacement work for one failure.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | no reason chosen | Choose what went wrong. | False | from a short configured list rather than free text, because free-text reasons on a station display become a single character within a week and the recall report is then worthless |
| `E_PRECONDITION` | 409 | the ticket is still in preparation | *(silent)* | False | this is not a recall; the correct act is to reopen the specific step, and the message says so |
| `E_PRECONDITION` | 409 | the ticket was already recalled | *(silent)* | False | returns the existing successor. Recalling a recall means working on the successor |
| `E_DEPENDENCY` | 424 | the source cannot be told through the port | *(silent)* | True | the recall COMMITS and the notification is queued. The replacement work must start regardless of whether the source system is reachable |

## 3. Edge cases

**EC-01.** Recall of part of a ticket. The successor contains only the affected lines, and the unaffected parts are not redone. Redoing everything is the naive implementation and it doubles the cost of every partial failure.

**EC-02.** Recall after collection, reported by the source. Fully supported and is the most common case. The successor carries a marker that the original had already left, because that changes both the urgency and the cost.

**EC-03.** A recall chain. Each successor points at its immediate predecessor and the chain is walked with a depth guard. A second recall of the same request is escalated immediately rather than counted as a pattern, because another attempt is unlikely to fix what two attempts have not.

**EC-04.** Recall reasons concentrated on one item or one station. This is the entire value of the reason list and it is reported to ops_manager weekly. The report deliberately shows reasons by station and by item separately, because attributing an item problem to a station is how the wrong thing gets fixed.

**EC-05.** The cost of recalled work. Recorded from the elapsed time and the consumed components of the original steps. Without it a recall looks free, and an operation that believes recalls are free will not reduce them.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/kitchen_flow/preparation_ticket/recall_ticket.md`.
