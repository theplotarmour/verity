---
doc_id: ENT-TENANT_MEMBERSHIP
title: Entity — Tenant Membership
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Tenant Membership

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Capability/module:** `core_identity_session` · **Owner scope:** `tenant`

The link between a principal and a tenant. A principal with zero memberships can authenticate but has nowhere to land.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `principal_id` | uuid | yes | no | — | no | no |  |
| `tenant_id` | uuid | yes | no | — | no | no | the platform tenant this membership is in, resolved through the tenant_directory port. Deliberately NOT a foreign key - the tenant entity is owned by hq_console and kernel K04 forbids a concrete cross-capability reference |
| `status` | enum | yes | no | — | no | no |  |
| `employment_link_id` | uuid | no | no | — | no | no | links to people.employee when the principal is staff, null for client contacts |
| `default_landing_surface` | enum | yes | no | — | no | no |  |
| `invited_by_principal_id` | uuid | no | no | — | no | no |  |
| `joined_at` | timestamptz | no | no | — | no | no |  |
| `revoked_at` | timestamptz | no | no | — | no | no |  |

## 2. Lifecycle

States: `invited`, `active`, `suspended`, `revoked`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `invited` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `suspended` | GAP | GAP | GAP | entity-specific, see capability model |
| `revoked` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. unique(principal_id, tenant_id)
2. Revoking the last active membership with tenant_owner archetype is forbidden; see action revoke_membership.

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

- Permission matrix: `14-PERMISSIONS/core_identity_session/tenant_membership.md`
- Screen specifications: `11-UX/screens/core_identity_session/tenant_membership/`
- Test catalogue: `20-TESTING/core_identity_session/tenant_membership/`
