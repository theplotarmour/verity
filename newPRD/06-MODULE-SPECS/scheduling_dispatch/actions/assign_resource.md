---
doc_id: ACT-SCHEDULING_DISPATCH-ASSIGN_RESOURCE
title: Action — Assign a resource to a demand
generated: true
source_model: _model/capabilities/scheduling_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Assign a resource to a demand

*This document is generated. Edit `_model/capabilities/scheduling_dispatch.yaml`, not this file.*

**Entity:** `assignment` · **Capability:** `scheduling_dispatch`

## 1. Specification

### Who can perform it

- dispatcher
- ops_manager
- supervisor
- system

### Preconditions

- The demand is in state open, partially_covered or at_risk.
- The resource is reported available by the schedulable_resource port for the whole window, or the escalation path is used with a reason.
- The resource holds every required qualification, or the override path is used with a reason.
- No overlapping non-terminal assignment exists for this resource.
- Working-hour limits reported by the resource provider are not breached.

### Inputs

- demand_id
- resource_ref
- starts_at
- ends_at
- assignment_reason
- acceptance_required
- override_reason

### What is created

- assignment

### What is modified

- demand coverage and state
- resource availability through the port

### What events fire

- assignment.created
- demand.coverage_changed

### Who is notified

- **to**: the resource; **channel**: push_and_in_app; **when**: the assignment is published, not at creation; **template**: assignment_published; **must_include**: ['window', 'location', 'what_changed_if_a_version']; **mandatory_operational**: True
- **to**: dispatcher; **channel**: in_app; **when**: an override or escalation path was used; **template**: override_recorded; **must_include**: ['override_reason', 'actor_display_name']

### Can it be undone

Yes.

### Concurrency behaviour

The overlap constraint is enforced by an exclusion constraint on the resource over the time range, inside the transaction, not by a read-then-write check. Two dispatchers assigning the same resource to overlapping demands: one succeeds, the other receives E_CONFLICT_UNIQUE naming the winning assignment and its dispatcher. Coverage counting on the demand is done under a row lock on the demand, so required_count can never be exceeded by a race - over-assignment is as much a defect as under-assignment because somebody travels for nothing.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_UNIQUE` | 409 | the resource already has an overlapping assignment | This person is already assigned at that time. | False | names the other assignment and its location, because the dispatcher's next question is always where |
| `E_PRECONDITION` | 409 | the resource is reported unavailable | This action is not available in the current state. | False | the message carries the single reason CODE from the resource provider, resolved to a human phrase locally. It never carries the provider's reason text, which may be sensitive |
| `E_PRECONDITION` | 409 | a required qualification is missing or expired | This action is not available in the current state. | False | names the qualification, which is not sensitive, unlike an absence reason |
| `E_PRECONDITION` | 409 | a working-hour limit would be breached | This action is not available in the current state. | False | names the specific limit and the resulting total. A limit refusal that does not say by how much is a refusal the dispatcher will route around |
| `E_VALIDATION` | 422 | assignment window falls outside the demand window and the demand is not flexible | This does not fit the requested time. | False |  |
| `E_VALIDATION` | 422 | assigned_by is optimiser and assignment_reason is empty | *(silent)* | False | an unexplained automatic assignment is refused at write time rather than being allowed to erode trust in the optimiser |
| `E_QUOTA` | 402 | cost_estimate would breach the demand's cost ceiling | Plan limit reached. | False | routed through the approval_chain port where bound, refused with the ceiling named where not |
| `E_CONFLICT_VERSION` | 409 | the demand changed since the dispatch screen loaded | Someone else changed this record. | True |  |

## 3. Edge cases

**EC-01.** Assigning across the location's day boundary. The assignment is one record spanning the boundary; attribution to operating days is computed by the location_calendar port and is recorded on the assignment rather than derived later, so that a calendar change cannot retroactively move somebody's hours between days.

**EC-02.** Assigning a resource whose availability window ends mid-assignment. Refused. Partial availability produces a partial assignment only if the demand's required_count and window permit splitting, and splitting is always an explicit act rather than an automatic one.

**EC-03.** Assignment created before the demand is published to the resource. Normal - creation and publication are separate, and this is what makes a draft roster possible.

**EC-04.** Two demands at the same location in the same window each needing the same single resource. Both cannot be covered. The engine does not silently prefer one; it reports the contention with both priorities and the dispatcher chooses. Automatic priority resolution is offered as configuration and is off by default, because the first time it silently drops an urgent demand nobody will trust it again.

**EC-05.** An override used to assign an unavailable resource. Permitted for a dispatcher only where the tenant enables it, always requires a reason, is reported to ops_manager and is counted. A rising override count is the signal that the availability data is wrong, which is more useful than blocking the override and having the dispatcher work around the system entirely.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/scheduling_dispatch/assignment/assign_resource.md`.
