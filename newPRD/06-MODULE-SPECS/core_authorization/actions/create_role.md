---
doc_id: ACT-CORE_AUTHORIZATION-CREATE_ROLE
title: Action — Create a role
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Create a role

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Entity:** `role` · **Capability:** `core_authorization`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- acting session is elevated
- key is unique within the tenant
- every archetype named exists in the vocabulary

### Inputs

- key
- label
- archetypes
- assignable_scopes
- requires_mfa
- clone_from_role_id_optional

### What is created

- role
- permission_grant_rows_when_cloning

### What is modified

None.

### What events fire

- role.created

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

Unique index on (tenant_id, key). A losing concurrent create resolves to the idempotent 200 above.

### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_CONFLICT_UNIQUE` | 409 | key already exists with different content | A role with this key already exists. | False |  |
| `E_VALIDATION` | 422 | archetypes empty or contains an unknown archetype | field-specific | False |  |
| `E_AUTHZ_FIELD` | 200 | the creator names an archetype they do not themselves hold | *(silent)* | False | the archetype picker is projected to what the creator holds, and the server re-checks. This is the primary privilege-escalation path in any role system and it is closed at write time rather than at bind time |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |
| `E_QUOTA` | 402 | tenant role count limit reached | Plan limit reached. | False | the limit exists because role explosion is the failure mode this model is designed to avoid, and an unbounded count is evidence it is happening |

## 3. Edge cases

**EC-01.** Cloning a system role copies its grants and clears is_system. The clone records which system role and which capability version it was cloned from, so that when the system role gains a grant in a later version the clone can be reported as diverged rather than silently left behind.

**EC-02.** A role created while a capability is disabled may reference entities that are not currently in the manifest. This is permitted and the role stays in draft; publish_role is what enforces manifest consistency. Refusing at creation would make staging a pack impossible.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_authorization/role/create_role.md`.
