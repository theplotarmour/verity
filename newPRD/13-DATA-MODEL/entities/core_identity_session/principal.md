---
doc_id: ENT-PRINCIPAL
title: Entity — Principal
generated: true
source_model: _model/capabilities/core_identity_session.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Principal

*This document is generated. Edit `_model/capabilities/core_identity_session.yaml`, not this file.*

**Capability/module:** `core_identity_session` · **Owner scope:** `platform`

Any actor that can hold a session. Human user, service account, or external portal identity.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `kind` | enum | yes | yes | — | no | no |  |
| `primary_email` | citext | no | no | platform | yes | no | 'nullable because Indian field workforce onboards by phone, not email |
| `primary_phone_e164` | string | no | no | platform | yes | no |  |
| `display_name` | string | yes | no | — | no | no |  |
| `status` | enum | yes | no | — | no | no |  |
| `mfa_enrolled` | bool | yes | no | — | no | no |  |
| `password_credential_id` | uuid | no | no | — | no | no | null for phone-OTP-only principals |
| `failed_auth_count` | int | no | no | — | no | no |  |
| `locked_until` | timestamptz | no | no | — | no | no |  |
| `last_authenticated_at` | timestamptz | no | no | — | no | no |  |
| `created_at` | timestamptz | yes | yes | — | no | no |  |
| `deactivated_at` | timestamptz | no | no | — | no | no |  |

## 2. Lifecycle

States: `invited`, `active`, `suspended`, `locked`, `deactivated`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `invited` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `suspended` | GAP | GAP | GAP | entity-specific, see capability model |
| `locked` | GAP | GAP | GAP | entity-specific, see capability model |
| `deactivated` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. At least one of primary_email or primary_phone_e164 must be non-null for kind=user.
2. kind=service_account must have both null and authenticate only by credential.
3. status=deactivated is terminal for authentication but the row is never hard-deleted while any audit row references it.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `cross_tenant_row_with_membership`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/core_identity_session/principal.md`
- Screen specifications: `11-UX/screens/core_identity_session/principal/`
- Test catalogue: `20-TESTING/core_identity_session/principal/`
