---
doc_id: ENT-TENANT
title: Entity — Tenant
generated: true
source_model: _model/capabilities/hq_console.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Tenant

*This document is generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

**Capability/module:** `hq_console` · **Owner scope:** `platform`

One customer workspace - its identity, its commercial state, its residency and its lifecycle. The entity every tenant_scoped row in the platform is isolated by.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | global | no | no | the stable short identifier used in support conversations and in every log line |
| `display_name` | string | yes | no | — | no | no |  |
| `legal_party_ref` | string | no | no | — | yes | no | the contracting entity, held as a reference to the platform's own commercial records rather than as a party inside any tenant |
| `created_at` | timestamptz | yes | yes | — | no | no |  |
| `plan_key` | string | yes | no | — | no | yes |  |
| `seat_entitlement` | int | no | no | — | no | yes |  |
| `data_residency_region` | string | yes | yes | — | no | no | immutable, because moving a tenant between regions is a migration with legal consequences and not a field edit |
| `primary_locale` | string | yes | no | — | no | no |  |
| `primary_timezone` | string | yes | no | — | no | no |  |
| `support_access_consent_until` | timestamptz | no | no | — | no | no | time-boxed consent for impersonation. A permanent consent is deliberately not offered |
| `support_access_contract_clause` | bool | yes | no | — | no | no | whether the contract permits support access without per-instance consent |
| `current_manifest_id` | uuid | no | no | — | no | no |  |
| `suspension_reason` | text | no | no | — | no | no |  |
| `suspended_at` | timestamptz | no | no | — | no | no |  |
| `closure_requested_at` | timestamptz | no | no | — | no | no |  |
| `data_erasure_due_at` | timestamptz | no | no | — | no | no | when the retention window after closure expires and data is destroyed |
| `export_delivered_at` | timestamptz | no | no | — | no | no | when the tenant's own data was handed back to them, which must precede erasure |

## 2. Lifecycle

States: `provisioning`, `trial`, `active`, `suspended`, `closure_requested`, `closed`, `purged`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `provisioning` | GAP | GAP | GAP | entity-specific, see capability model |
| `trial` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `suspended` | GAP | GAP | GAP | entity-specific, see capability model |
| `closure_requested` | GAP | GAP | GAP | entity-specific, see capability model |
| `closed` | GAP | GAP | GAP | entity-specific, see capability model |
| `purged` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. data_residency_region is immutable. A change is a migration with legal consequences, executed as a distinct operation rather than as an edit.
2. Suspension never deletes, hides or degrades tenant data. It restricts sign-in and it leaves everything else intact, because the most common suspension is an unpaid invoice that is paid the following week.
3. Closure never destroys data before export_delivered_at is set, or before an explicit waiver is recorded by the tenant. Destroying a customer's records before giving them back is unrecoverable and indefensible.
4. support_access_consent_until is time-boxed and expires. There is no permanent consent value.
5. Every tenant_scoped table in the platform is isolated by this entity's id through row-level security at the database role level, not by application predicates. This is restated here because this is the entity that isolation is defined against.

## 4. Deletion and retention semantics

| Question | Answer |
|---|---|
| Soft or hard delete | Soft by default (`deleted` reserved state). Hard delete only via retention job or a data-subject erasure request. |
| What happens to children | Blocked if any child row in a non-terminal state references this row. The user is shown the blocking rows, not a generic error. |
| What happens to audit rows | Retained. Audit rows are never cascade-deleted. |
| What happens to emitted events | Retained. Events are immutable history. |
| Archive vs delete | Archive removes from default lists and aggregate reports; delete removes from all reads except audit and legal hold. |

## 5. Tenant isolation

Tenancy mode: `platform_scoped`. Enforced by Postgres row-level security on `tenant_id`, not by application `WHERE` clauses. Every query runs under a role that cannot see other tenants even if the application layer forgets a predicate. Cross-tenant reads require a platform archetype and are audited under `security`.

## 6. Related documents

- Permission matrix: `14-PERMISSIONS/hq_console/tenant.md`
- Screen specifications: `11-UX/screens/hq_console/tenant/`
- Test catalogue: `20-TESTING/hq_console/tenant/`
