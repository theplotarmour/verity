---
doc_id: ACT-CORE_CONFIGURATION-APPLY_CHANGE_SET
title: Action — Apply a configuration change
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Apply a configuration change

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

**Entity:** `config_change_set` · **Capability:** `core_configuration`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- Acting session is elevated.
- The set is approved, or its highest_change_impact is immediate or next_session.
- The approval, where required, is not older than approval_validity_days.

### Inputs

- change_set_id

### What is created

- config_value rows for every member

### What is modified

- previous values superseded
- resolution caches invalidated
- post-deploy reconciliation scheduled

### What events fire

- change_set.applied
- config.changed per member

### Who is notified

- **to**: tenant_owner; **channel**: in_app_and_email; **when**: the set contains a financial, security-affecting or migration-class change; **template**: configuration_applied; **must_include**: ['label', 'member_count', 'actor_display_name']

### Can it be undone

No — this action is irreversible. The UI must confirm before, not offer undo after.

### Concurrency behaviour

The whole set is applied in one transaction. Concurrent single-key writes to any key in the set fail with E_CONFLICT_VERSION rather than interleaving. The reconciliation sweep runs after commit and compares the running system against the resolved manifest, so a partial application caused by anything below the transaction boundary is detected rather than assumed impossible.


### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | approval expired | This was approved more than N days ago. It needs approving again. | False |  |
| `E_PRECONDITION` | 409 | staging run never completed | This action is not available in the current state. | False |  |
| `E_CONFLICT_VERSION` | 409 | a member key changed since the set was staged | Someone else changed this record. | True | names the specific keys that moved, so the administrator can decide whether their change is still the right one |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_INTERNAL` | 500 | the transaction fails partway | Something went wrong. The team has been notified. | True | the whole set rolls back. A half-applied configuration is a state nobody designed |

## 3. Edge cases

**EC-01.** Applying a set that changes a setting a running workflow depends on. Running workflow instances continue on the definition version they started with; the composition model is explicit that a workflow change is a new version and never an edit to a running instance. The same principle is applied to configuration a workflow reads.

**EC-02.** Applying a rollback change set. It is an ordinary change set whose members restore previous values, with rollback_of_change_set_id set for narrative. It is not privileged and it goes through the same path, because a rollback applied without testing is how one incident becomes two.

**EC-03.** Post-deploy reconciliation finds drift. Reported as an alert naming the key, the expected value and the observed behaviour. Never auto-corrected, because auto-correcting drift can mean overwriting an emergency manual intervention somebody made at 3am.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_configuration/config_change_set/apply_change_set.md`.
