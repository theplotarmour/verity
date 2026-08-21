---
doc_id: ACT-SCHEDULING_DISPATCH-PUBLISH_SCHEDULE
title: Action — Publish the schedule
generated: true
source_model: _model/capabilities/scheduling_dispatch.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Publish the schedule

*This document is generated. Edit `_model/capabilities/scheduling_dispatch.yaml`, not this file.*

**Entity:** `schedule_version` · **Capability:** `scheduling_dispatch`

**Why this exists:** Publication is the moment a plan becomes a set of promises to people. Separating it from planning is what makes a draft roster safe to work on, and versioning it is what makes a later dispute answerable.


## 1. Specification

### Who can perform it

- dispatcher
- ops_manager

### Preconditions

- Every planned assignment in the period is included or explicitly excluded.
- Any coverage shortfall is acknowledged.
- The publisher holds assign at a scope covering every location in the period.

### Inputs

- scope_location_ref
- period_start
- period_end
- excluded_assignment_ids
- shortfall_acknowledgement

### What is created

- schedule_version

### What is modified

- included assignments move to published
- previous version superseded

### What events fire

- schedule.published
- assignment.published per assignment

### Who is notified

- **to**: every resource with an included assignment; **channel**: push_and_in_app; **when**: always; **template**: schedule_published; **must_include**: ['changed_assignments_only_where_a_previous_version_exists']; **batching_policy**: one message per resource per publication, never one per assignment; **mandatory_operational**: True
- **to**: the supervisor of each location in scope; **channel**: in_app; **when**: coverage_shortfall_count is non-zero; **template**: coverage_shortfall; **must_include**: ['shortfall_by_demand']

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

Publication takes an advisory lock on (scope, period). A second publication waits rather than interleaving, and on acquiring the lock recomputes its change summary against whatever is now the current version - so the summary a resource receives always describes the change from what they were previously told, not from what the publisher happened to be looking at.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | planned assignments in the period are neither included nor excluded | Some assignments are neither published nor excluded. | False | names them. A silently omitted assignment is a person left off the roster |
| `E_VALIDATION` | 422 | shortfall not acknowledged | Confirm you have seen the gaps. | False |  |
| `E_AUTHZ_SCOPE` | 404 | the period contains a location outside the publisher's scope | Not found. | False |  |
| `E_DEPENDENCY` | 424 | notification provider unavailable | *(silent)* | True | publication COMMITS and notifications are queued for retry. A schedule that fails to publish because a message could not be sent leaves the dispatcher believing it did not publish, and they will publish again |
| `E_QUOTA` | 402 | the period contains more than max_assignments_per_publication | Plan limit reached. | False | publication is split by scope rather than raised, because a single publication touching tens of thousands of people is a notification incident |

## 3. Edge cases

**EC-01.** Republishing after a small change. Every affected resource receives a CHANGE summary, not the whole roster, and resources with no change receive nothing at all. Sending an unchanged roster to two hundred people is how they learn to ignore roster notifications, after which the next real change is missed.

**EC-02.** A change published inside late_change_hours of the assignment's start. Permitted, flagged in the confirmation, counted per dispatcher and reported. Verity does not block late changes - operations require them - and it does make their frequency visible, because a roster changed at midnight every night is a management problem rather than a scheduling one.

**EC-03.** Publishing a period that overlaps an already-published period. The overlap is resolved by publishing a new version of the union, never two versions of overlapping ranges, because a resource holding two versions covering the same evening cannot tell which is current.

**EC-04.** A resource whose only assignment in the period is excluded. They are notified that they have no assignments in the period, not left with the previous version. Silence after a published roster is indistinguishable from an unchanged roster.

**EC-05.** Publishing when the notification port is unbound. Permitted, and the confirmation states plainly that nobody will be told and that resources must open the app. This is the most consequential unbound behaviour in the library and the confirmation is where it becomes visible to the person it affects.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/scheduling_dispatch/schedule_version/publish_schedule.md`.
