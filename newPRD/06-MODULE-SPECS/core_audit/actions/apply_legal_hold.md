---
doc_id: ACT-CORE_AUDIT-APPLY_LEGAL_HOLD
title: Action — Place a legal hold
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Place a legal hold

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

**Entity:** `legal_hold` · **Capability:** `core_audit`

## 1. Specification

### Who can perform it

- tenant_owner
- platform_operator

### Preconditions

- acting session is elevated
- a matter reference is supplied
- the scope expression passes static analysis

### Inputs

- reference
- scope_expression
- expected_release_at
- reason

### What is created

- legal_hold

### What is modified

- retention_class on every matching audit_record

### What events fire

- legal_hold.applied

### Who is notified

- **to**: tenant_owner; **channel**: email_and_in_app; **when**: always; **template**: legal_hold_applied; **mandatory_legal**: True
- **to**: platform_operator; **channel**: in_app; **when**: always; **template**: tenant_legal_hold; **note**: the platform must know which tenants carry holds before it runs any deletion machinery

### Can it be undone

Yes.

### Concurrency behaviour

The retention job takes a shared lock that the hold application takes exclusively, so a hold cannot land while rows within its scope are mid-expiry. Losing that race in the other direction - expiry running first - is the failure this lock exists to prevent and it is unrecoverable.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | scope_expression fails static analysis or exceeds the cost ceiling | field-specific | False | an unbounded hold expression that scans the entire history is refused at save time rather than timing out |
| `E_VALIDATION` | 422 | reference empty | A matter reference is required. | False |  |
| `E_QUOTA` | 402 | the hold would cover more than max_hold_rows | Plan limit reached. | False | a hold over everything is a retention policy change, not a hold, and must be recognised as such |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |

## 3. Edge cases

**EC-01.** A hold applied to rows that are already expired. Those rows cannot be recovered; the action succeeds for the rest and states plainly how many rows were already gone. Silently succeeding would let somebody believe evidence exists that does not.

**EC-02.** A hold whose scope expression matches rows written AFTER the hold was applied. Supported and is the normal case for an ongoing matter. The expression is evaluated at write time as well as at apply time, which means a hold makes every subsequent audit write slightly more expensive - a cost stated here rather than discovered in production.

**EC-03.** A hold applied by a principal who is themselves under investigation. Permitted to apply, forbidden to release. The asymmetry is deliberate.

**EC-04.** Interaction with a data-subject erasure request. A legal hold wins. The erasure request is recorded as received and as blocked, with the hold reference, so the obligation and the conflict are both documented rather than one silently overriding the other.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_audit/legal_hold/apply_legal_hold.md`.
