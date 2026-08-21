---
doc_id: ENT-DEVICE
title: Entity — Device
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Device

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Capability/module:** `core_identity_session` · **Owner scope:** `tenant`

A physical or logical client. Shared fixed-station devices and shared point-of-service terminals are first-class, not an afterthought.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | no | — | no | no |  |
| `label` | string | yes | no | — | no | no | human-set and said out loud, for example a short station name plus a number |
| `kind` | enum | yes | no | — | no | no |  |
| `shared` | bool | yes | no | — | no | no | shared devices get shorter idle timeouts and PIN-based fast user switching |
| `trust_status` | enum | yes | no | — | no | no |  |
| `bound_site_id` | uuid | no | no | — | no | no | a KDS bound to a site refuses sessions for other sites |
| `last_seen_at` | timestamptz | no | no | — | no | no |  |
| `os_family` | string | no | no | — | no | no |  |
| `app_version` | string | no | no | — | no | no |  |
| `min_supported_version_ok` | bool | no | no | — | no | no |  |

## 2. Lifecycle

States: `untrusted`, `trusted`, `blocked`, `archived`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `untrusted` | GAP | GAP | GAP | entity-specific, see capability model |
| `trusted` | GAP | GAP | GAP | entity-specific, see capability model |
| `blocked` | GAP | GAP | GAP | entity-specific, see capability model |
| `archived` | True | False | False | Retained, excluded from default lists and from all aggregate reports unless explicitly included. |

## 3. Invariants

1. kind=kds_screen or pos_terminal implies shared=true.
2. A blocked device may not mint sessions and its existing sessions are revoked on block.

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

- Permission matrix: `14-PERMISSIONS/core_identity_session/device.md`
- Screen specifications: `11-UX/screens/core_identity_session/device/`
- Test catalogue: `20-TESTING/core_identity_session/device/`
