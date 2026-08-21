---
doc_id: ACT-PEOPLE-VERIFY_QUALIFICATION
title: Action — Verify a qualification
generated: true
source_model: _model/capabilities/people.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Verify a qualification

*This document is generated. Edit `_model/capabilities/people.yaml`, not this file.*

**Entity:** `qualification` · **Capability:** `people`

## 1. Specification

### Who can perform it

- supervisor
- ops_manager
- tenant_admin

### Preconditions

- the qualification is in state claimed
- a verification method other than none is chosen
- evidence is attached where the type requires it

### Inputs

- qualification_id
- verification_method
- evidence_ref
- valid_from
- valid_to
- reference

### What is created

None.

### What is modified

- qualification state
- verified_by_principal_id
- verified_at

### What events fire

- qualification.verified

### Who is notified

- **to**: the member and the dispatcher; **channel**: in_app; **when**: the verification unblocks assignment eligibility; **template**: eligibility_changed

### Can it be undone

Yes.

### Concurrency behaviour

Optimistic on the qualification row. Two supervisors verifying the same qualification concurrently converge because the write is idempotent on the same inputs and conflicts with E_CONFLICT_VERSION when the validity dates differ, which is a disagreement about the document rather than a race.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | valid_to null on a type that expires | Enter the expiry date. | False | never defaulted from default_validity_months without showing the computed date for confirmation, because a silently computed expiry is one nobody will check against the document |
| `E_PRECONDITION` | 409 | evidence required by the type is absent | Attach the document. | False |  |
| `E_VALIDATION` | 422 | valid_to in the past | This has already expired. | False | accepted with an explicit acknowledgement, because recording a historically valid qualification is legitimate when reconstructing a record |
| `E_DEPENDENCY` | 424 | evidence_capture unavailable | A required service is unavailable. | True | verification with document_seen is refused when the type requires evidence, and permitted when it does not |

## 3. Edge cases

**EC-01.** Verification by the member themselves. Refused for any type that is not self_declarable, and refused always for a mandatory_for_engagement type, which by invariant cannot be self-declarable anyway. The two rules are deliberately redundant.

**EC-02.** A qualification verified against a document that later proves forged. Handled by revoke_qualification rather than by unverify, because revocation escalates the affected assignments and unverification only lists them. The distinction is the whole reason both actions exist.

**EC-03.** Verifying with issuer_checked when the issuer's system is unavailable. Not permitted to record issuer_checked on the strength of an intention. The supervisor records document_seen and the weak-verification list picks it up later.

**EC-04.** A renewal that arrives before the current validity ends. Recorded as a new version of the same qualification row with a continuous history, not a second row, so that "has this person held this continuously" is answerable - which is the question an incident review actually asks.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/people/qualification/verify_qualification.md`.
