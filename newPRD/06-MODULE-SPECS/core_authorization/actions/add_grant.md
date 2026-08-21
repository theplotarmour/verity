---
doc_id: ACT-CORE_AUTHORIZATION-ADD_GRANT
title: Action — Add a permission to a role
generated: true
source_model: _model/capabilities/core_authorization.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Add a permission to a role

*This document is generated. Edit `_model/capabilities/core_authorization.yaml`, not this file.*

**Entity:** `permission_grant` · **Capability:** `core_authorization`

## 1. Specification

### Who can perform it

- tenant_admin
- tenant_owner

### Preconditions

- Acting session is elevated.
- The acting principal already holds the verb being granted, at a scope at least as wide, on the same entity.
- The role is not is_system.

### Inputs

- role_id
- effect
- verb
- capability_key
- entity_key
- field_set_mode
- field_list
- scope
- condition_expression

### What is created

- permission_grant

### What is modified

- permission cache invalidated for every principal bound to the role

### What events fire

- permission.granted

### Who is notified

- **to**: every principal holding a binding to this role; **channel**: in_app; **when**: the grant widens their access; **template**: access_changed; **batching_policy**: one message per role change, not one per grant, and suppressed entirely for draft roles
- **to**: auditor; **channel**: none; **when**: always; **template**: None; **note**: the auditor consumes the permission_change_feed rather than notifications

### Can it be undone

Yes.

### Concurrency behaviour

Grants are append-only within a role and are never edited in place - editing a grant is remove plus add, so the audit shows what changed rather than showing that something changed. Two concurrent adds of different grants both succeed. Two concurrent adds of the same grant collapse via the idempotency key.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHZ_ENTITY` | 403 | the granter does not themselves hold this verb at this scope | You cannot grant access you do not have. | False | no-privilege-escalation is the load-bearing rule of this entire capability. It is checked against the granter's permissions at request time, not against their archetype, because archetypes are a labelling convenience and permissions are the truth |
| `E_VALIDATION` | 422 | field_set_mode explicit with empty field_list | Choose at least one field. | False |  |
| `E_VALIDATION` | 422 | condition_expression fails static analysis - unknown identifier, exceeds the cost ceiling, or traverses a relationship the grantee could not traverse | field-specific | False | rejected at save time rather than timing out at runtime, per kernel K16. The error names the offending token and the ceiling that was exceeded |
| `E_PRECONDITION` | 409 | role is is_system | System roles cannot be edited. Clone it first. | False |  |
| `E_PRECONDITION` | 409 | scope=platform requested by a tenant-bound principal | This action is not available in the current state. | False | deliberately vague. A specific message would teach a tenant administrator that a cross-tenant scope exists |
| `E_AUTHN` | 401 | session not elevated | Confirm your identity to continue. | False |  |

## 3. Edge cases

**EC-01.** Adding a DENY grant that makes an existing ALLOW unreachable. Permitted, and the UI shows which existing grants it neutralises before saving. Refusing would be wrong - carving out is exactly what deny is for - but doing it silently produces a role nobody can reason about.

**EC-02.** Adding a grant to a role bound to the acting principal themselves. Permitted, and separately flagged in the audit stream as a self-grant, because self-granting is legitimate for an owner and is the first thing an investigator looks for.

**EC-03.** A grant referencing an entity that a later capability upgrade removes. Reported as a BROKEN override, blocks the upgrade in staging, and lists the tenant, the exact grant and the change that broke it. Never silently dropped - the composition model is explicit about this.

**EC-04.** Adding a grant while a bulk permission import is running. The import takes an advisory lock per role; the interactive add waits rather than interleaving, because a half-applied permission set is a security state nobody has reasoned about.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_authorization/permission_grant/add_grant.md`.
