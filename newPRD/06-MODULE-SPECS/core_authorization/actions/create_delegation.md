---
doc_id: ACT-CORE_AUTHORIZATION-CREATE_DELEGATION
title: Action — Delegate authority during an absence
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Delegate authority during an absence

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Entity:** `delegation` · **Capability:** `core_authorization`

**Why this exists:** Absence is normal and unplanned absence is normal too. Without a first-class delegation the workaround is credential sharing, which destroys attribution for every action taken. Modelling delegation is how the audit trail survives a manager going on leave.


## 1. Specification

### Who can perform it

- any_authenticated_with_delegable_authority

### Preconditions

- The delegator is not themselves acting under a delegation.
- ends_at minus starts_at does not exceed max_delegation_days.
- verb_subset contains no administer verb.
- The delegate has an active membership in this tenant.

### Inputs

- to_principal_id
- verb_subset
- entity_subset
- scope_narrowing
- starts_at
- ends_at
- reason

### What is created

- delegation

### What is modified

None.

### What events fire

- delegation.created

### Who is notified

- **to**: to_principal; **channel**: in_app_and_push; **when**: always; **template**: delegation_offered; **must_include**: ['from_display_name', 'verb_summary', 'window', 'reason']
- **to**: the delegator's manager where the org_structure port resolves one; **channel**: in_app; **when**: the delegated verbs include approve; **template**: approval_authority_delegated

### Can it be undone

Yes.

### Concurrency behaviour

Overlapping delegations from the same delegator to different delegates are permitted and their effects union. Overlapping delegations to the SAME delegate are collapsed into one by the idempotency key when identical, and rejected with E_CONFLICT_UNIQUE when they differ, because two different answers to "what may this person do on your behalf right now" is not a state anyone can reason about.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_VALIDATION` | 422 | window exceeds max_delegation_days | A delegation can last at most N days. For anything longer, grant a role. | False | the message names the correct alternative rather than only refusing |
| `E_PRECONDITION` | 409 | the delegator is acting under a delegation | You cannot pass on authority that was delegated to you. | False |  |
| `E_VALIDATION` | 422 | verb_subset contains administer | Configuration authority cannot be delegated. | False |  |
| `E_AUTHZ_ENTITY` | 403 | verb_subset contains a verb the delegator does not hold | You cannot delegate access you do not have. | False |  |
| `E_CONFLICT_UNIQUE` | 409 | a different overlapping delegation to the same delegate already exists | You already have a different delegation to this person in this period. | False |  |

## 3. Edge cases

**EC-01.** The delegator loses a permission while the delegation is active. The delegate loses it in the same instant, because evaluation is against the delegator's live permissions rather than a snapshot. This is stated in the invariants because the snapshot design is the intuitive one and it is wrong.

**EC-02.** The delegator is suspended or deactivated. All their active delegations are revoked immediately with reason=delegator_unavailable, and both parties plus the tenant_admin are told. A delegation outliving its delegator is a permission with no owner.

**EC-03.** The delegate is already more privileged than the delegator. The delegation grants nothing new and is refused at creation with a message saying so, rather than being created as a no-op that somebody will later assume is doing something.

**EC-04.** Actions performed under a delegation are attributed to the delegate AND record the delegation id and the delegator. Both names appear in the audit and in any approval record. Attributing only to the delegate loses accountability; attributing only to the delegator is a lie.

**EC-05.** A delegation spanning a capability being disabled. The delegated verbs on that capability simply resolve to deny, matching the behaviour of a normal grant against a disabled capability.

**EC-06.** The delegate declines. Modelled as revoke_delegation by to_principal, not as a separate rejection state, so that there is one revocation path and one audit shape.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_authorization/delegation/create_delegation.md`.
