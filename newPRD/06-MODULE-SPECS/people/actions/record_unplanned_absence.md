---
doc_id: ACT-PEOPLE-RECORD_UNPLANNED_ABSENCE
title: Action — Record that somebody is not coming in
generated: true
source_model: _model/capabilities/people.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Record that somebody is not coming in

*This document is generated. Edit `_model/capabilities/people.yaml`, not this file.*

**Entity:** `absence` · **Capability:** `people`

**Why this exists:** The action that everything downstream hangs off. It happens under time pressure, often by phone, often by somebody who is not the absent person, and it must be possible in under ten seconds on a bad connection.


## 1. Specification

### Who can perform it

- supervisor
- dispatcher
- ops_manager
- employee

### Preconditions

- the member exists and is in state active or on_leave
- no overlapping absence exists

### Inputs

- member_id
- absence_kind
- starts_at
- ends_at
- notified_at
- reason_text
- evidence_ref

### What is created

- absence

### What is modified

- workforce_member state
- schedulable_resource availability

### What events fire

- absence.recorded
- member.became_unavailable

### Who is notified

- **to**: dispatcher; **channel**: push_and_in_app; **when**: the member holds commitments in the window; **template**: member_unavailable; **must_include**: ['member_display_name', 'window', 'affected_commitment_count']; **priority**: high; **mandatory_operational**: True
- **to**: the supervisor of each affected location; **channel**: in_app; **when**: as above; **template**: member_unavailable

### Can it be undone

Yes.

### Concurrency behaviour

Overlap detection is performed under a lock on the member row, so two concurrent absences for one person cannot both commit. The loser is shown the winner's absence rather than a generic conflict, because the two records are usually the same absence reported twice and the person recording it needs to see that immediately.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_UNIQUE` | 409 | an overlapping absence already exists | There is already an absence recorded for this period. | False | shows the existing record |
| `E_VALIDATION` | 422 | ends_at before starts_at | The end has to be after the start. | False |  |
| `E_PRECONDITION` | 409 | the member is in state ended | This action is not available in the current state. | False |  |
| `E_AUTHZ_FIELD` | 200 | reason_text supplied by a principal without view_sensitive | *(silent)* | False | the field is dropped and the recorder is told. A dispatcher recording an absence by phone should not be able to write health information into a field they cannot read back |
| `E_DEPENDENCY` | 424 | the backfill_request port is bound but unavailable | *(silent)* | True | the absence still commits and the backfill signal is queued for retry. An absence that fails to record because a downstream service is down leaves a commitment looking staffed when it is not, which is the worst available outcome |

## 3. Edge cases

**EC-01.** Recorded offline by a supervisor with no signal. Queued, and the member is marked unavailable locally so the supervisor's own view is correct. On sync the backfill signal fires late, which is stated on the record - the gap between notified_at and recorded_at is retained and is exactly what a later dispute about cover examines.

**EC-02.** Recorded by somebody other than the member, which is the normal case. The recording principal is captured separately from the member, and the member is notified that an absence was recorded for them - because an absence recorded against the wrong person is common at shift change and only the wrongly-marked person will notice.

**EC-03.** An absence recorded for a period that has already partly elapsed and during which the person actually worked. The overlap with recorded presence is detected and surfaced rather than silently resolved. Verity does not decide whether the attendance or the absence is the truth; it presents both and makes somebody choose, because that choice has a pay consequence.

**EC-04.** An absence whose kind is medical recorded by a dispatcher. The kind is visible, the reason is not writable by them, and the member and supervisor are told so that the sensitive detail can be added by somebody permitted to hold it.

**EC-05.** Cancelling an absence after cover was arranged. The cover is NOT automatically released. The dispatcher is told and decides, because releasing a reliever who has already travelled to a location is a cost somebody has to own deliberately.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/people/absence/record_unplanned_absence.md`.
