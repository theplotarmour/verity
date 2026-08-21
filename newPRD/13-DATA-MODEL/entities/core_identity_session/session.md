---
doc_id: ENT-SESSION
title: Entity — Session
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Session

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Capability/module:** `core_identity_session` · **Owner scope:** `platform`

A server-side revocable record. The client token is a pointer to this row, never a self-contained authority.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `principal_id` | uuid | yes | no | — | no | no |  |
| `tenant_id` | uuid | yes | no | — | no | no | a session is scoped to exactly one tenant, switching tenant mints a new session |
| `device_id` | uuid | yes | no | — | no | no |  |
| `surface` | enum | yes | no | — | no | no |  |
| `issued_at` | timestamptz | yes | yes | — | no | no |  |
| `absolute_expiry_at` | timestamptz | yes | yes | — | no | no |  |
| `idle_expiry_at` | timestamptz | yes | no | — | no | no | slides forward on activity, never past absolute_expiry_at |
| `revoked_at` | timestamptz | no | no | — | no | no |  |
| `revocation_reason` | enum | no | no | — | no | no |  |
| `elevated_until` | timestamptz | no | no | — | no | no | step-up window after re-auth, required for high-risk actions |
| `impersonated_by_principal_id` | uuid | no | no | — | no | no | set when a platform operator is acting as this principal |
| `impersonation_ticket_ref` | string | no | no | — | no | no |  |
| `ip_at_issue` | inet | no | no | — | no | no |  |
| `user_agent_at_issue` | text | no | no | — | no | no |  |

## 2. Lifecycle

States: `active`, `idle_expired`, `absolutely_expired`, `revoked`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `idle_expired` | GAP | GAP | GAP | entity-specific, see capability model |
| `absolutely_expired` | GAP | GAP | GAP | entity-specific, see capability model |
| `revoked` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A revoked session is never un-revoked. Re-authentication mints a new row.
2. idle_expiry_at <= absolute_expiry_at always.
3. impersonated_by_principal_id non-null requires impersonation_ticket_ref non-null.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `tenant_scoped_row`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/core_identity_session/session.md`
- Screen specifications: `11-UX/screens/core_identity_session/session/`
- Test catalogue: `20-TESTING/core_identity_session/session/`
