---
doc_id: ENT-CONNECTION
title: Entity — Connection
generated: true
source_model: _model/capabilities/integrations.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Connection

*This document is generated. Edit `_model/capabilities/integrations.yaml`, not this file.*

**Capability/module:** `integrations` · **Owner scope:** `tenant`

One configured link to one external system, with its credentials by reference, its health and its ownership.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `connector_key` | string | yes | yes | — | no | no | which connector definition this instantiates |
| `label` | string | yes | no | — | no | no |  |
| `direction` | enum | yes | no | — | no | no |  |
| `credential_ref` | string | no | no | — | yes | no | a reference into the secret store, never the secret. This capability holds references and the secret store holds secrets, and nothing in Verity ever returns one |
| `credential_expires_at` | timestamptz | no | no | — | no | no | where the credential has a known expiry. The single most common cause of an integration that worked for a year and then stopped |
| `endpoint_url` | string | no | no | — | yes | no |  |
| `auth_kind` | enum | yes | no | — | no | no |  |
| `owner_principal_id` | uuid | yes | no | — | no | no | who is accountable for this connection. Mandatory, because an unowned integration is one nobody fixes |
| `environment` | enum | yes | no | — | no | no |  |
| `rate_limit_per_minute` | int | no | no | — | no | no | what the remote system permits, so Verity throttles itself rather than being throttled |
| `concurrency_limit` | int | yes | no | — | no | no |  |
| `retry_budget_hours` | int | yes | no | — | no | no | total window over which an outbound delivery is retried before it dead-letters |
| `mapping_version` | string | no | no | — | no | no |  |
| `last_success_at` | timestamptz | no | no | — | no | no |  |
| `last_failure_at` | timestamptz | no | no | — | no | no |  |
| `consecutive_failures` | int | yes | no | — | no | no |  |
| `acting_principal_id` | uuid | no | no | — | no | no | the integration principal whose permissions inbound calls are evaluated against. An integration never has implicit authority and never inherits a human's |

## 2. Lifecycle

States: `draft`, `testing`, `active`, `degraded`, `suspended`, `disabled`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `testing` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `degraded` | GAP | GAP | GAP | entity-specific, see capability model |
| `suspended` | GAP | GAP | GAP | entity-specific, see capability model |
| `disabled` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. credential_ref is a reference and is never the credential. No read path anywhere in the platform returns a secret, including to the connection's own owner, and rotation is performed by the secret store rather than by editing this row.
2. owner_principal_id is mandatory and must be an active principal. An unowned connection is an integration nobody fixes and it fails silently for months.
3. acting_principal_id is required for any connection accepting inbound writes, and must be an integration_principal rather than a human. An inbound call executing under a human's identity attributes machine writes to a person.
4. environment is immutable after creation. A staging connection promoted in place is how test data reaches a production system.
5. A connection may not be deleted while any undelivered outbound message or unresolved dead letter references it. It is disabled, because those messages still need somewhere to belong.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `tenant_scoped`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/integrations/connection.md`
- Screen specifications: `11-UX/screens/integrations/connection/`
- Test catalogue: `20-TESTING/integrations/connection/`
