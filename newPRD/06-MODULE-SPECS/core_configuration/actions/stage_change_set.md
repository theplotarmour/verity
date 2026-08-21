---
doc_id: ACT-CORE_CONFIGURATION-STAGE_CHANGE_SET
title: Action — Test a configuration change in staging
generated: true
source_model: _model/capabilities/core_configuration.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Test a configuration change in staging

*This document is generated. Edit `_model/capabilities/core_configuration.yaml`, not this file.*

**Entity:** `config_change_set` · **Capability:** `core_configuration`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- every member change validates
- the staging environment is free or the acting principal has evicted the previous occupant with a reason

### Inputs

- label
- changes

### What is created

- config_change_set
- staging_run

### What is modified

None.

### What events fire

- change_set.staged

### Who is notified

- **to**: the principal whose change set was evicted, if any; **channel**: in_app; **when**: on_eviction; **template**: staging_evicted; **must_include**: ['evicting_principal', 'reason']

### Can it be undone

Yes.

### Concurrency behaviour

One staged change set per tenant. The staging environment is a single resource and pretending otherwise produces acceptance results that describe neither change set.

### Audit class

always

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_PRECONDITION` | 409 | staging environment occupied | Another change is being tested. You can evict it, and they will be told. | False | offers the action rather than only refusing, and names who will be told |
| `E_DEPENDENCY` | 424 | staging environment unavailable | A required service is unavailable. | True | the change set stays draft. It is NOT auto-promoted to production on a staging outage, which is the shortcut that eventually causes the incident staging exists to prevent |
| `E_VALIDATION` | 422 | a member change references an unknown or retired key | field-specific | False |  |
| `E_QUOTA` | 402 | more than max_changes_per_set members | Plan limit reached. | False | a change set with two hundred members is a migration and cannot be meaningfully reviewed by a human, which is the entire purpose of the review step |

## 3. Edge cases

**EC-01.** The staging environment's data is a copy taken at an unstated moment. The acceptance run's meaning depends on how fresh that copy is, so the run result records the copy timestamp. A pass against three-month-old data is a weaker statement than it looks and the surface says so.

**EC-02.** A change set staged, then the underlying capability upgraded before it is applied. The set is invalidated and returns to draft with the reason, because its acceptance run tested a different system.

**EC-03.** Staging a set whose only members are immediate-impact. Permitted, and the surface offers the fast path instead, because forcing a branding colour change through staging is how a team learns to route around staging entirely.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_configuration/config_change_set/stage_change_set.md`.
