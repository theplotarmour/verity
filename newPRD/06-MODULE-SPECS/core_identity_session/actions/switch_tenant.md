---
doc_id: ACT-CORE_IDENTITY_SESSION-SWITCH_TENANT
title: Action — Switch workspace
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Action — Switch workspace

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Entity:** `session` · **Capability:** `core_identity_session`

**Why this exists:** A session is single-tenant. Switching mints a new session so no cross-tenant data can ever be served under one session id.

## 1. Specification

### Who can perform it

- session_holder_with_multiple_memberships

### Preconditions

- the principal holds an active membership in the target tenant
- the target tenant is not suspended
- no unsynced queue blocks the switch per the edge case below

### Inputs

- target_tenant_id
- offline_queue_disposition

### What is created

- new session

### What is modified

- old session revoked with reason=user_logout

### What events fire

- session.revoked
- session.created

### Who is notified

None.

### Can it be undone

Yes.

### Concurrency behaviour

The old session is revoked and the new one minted in one transaction, so there is no instant at which the principal holds two live sessions across two tenants. That is the property which makes cross-tenant leakage structurally impossible rather than merely unlikely.


### Audit class

security

## 2. Failure modes

| Code | HTTP | Cause | Message shown to user | Retryable | Notes |
|---|---|---|---|---|---|
| `E_AUTHZ_SCOPE` | 404 | no active membership in the target tenant | Not found. | False | deliberately 404 not 403 — a tenant picker must never confirm that a workspace exists to someone with no membership in it |
| `E_TENANT_SUSPENDED` | 423 | target tenant suspended | This workspace is suspended. | False |  |
| `E_PRECONDITION` | 409 | unsynced offline queue on a shared device | Sync before switching workspaces. | False | see edge cases |

## 3. Edge cases

**EC-01.** Unsynced offline queue for tenant A blocks switching to tenant B on a shared device; on a personal device the queue is retained per-tenant and switching is allowed.

## 6. Offline behaviour

Mutating action. Default policy: queue locally, apply optimistically, reconcile on reconnect using field-level last-write-wins, EXCEPT where the model marks the action financial or attendance-related, in which case it is refused offline and the user is told why.

## 7. Test coverage

See `20-TESTING/core_identity_session/session/switch_tenant.md`.
