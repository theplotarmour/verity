---
doc_id: ENT-AUDIT_RECORD
title: Entity — Audit Record
generated: true
source_model: _model/capabilities/core_audit.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Audit Record

*This document is generated. Edit `_model/capabilities/core_audit.yaml`, not this file.*

**Capability/module:** `core_audit` · **Owner scope:** `tenant`

One immutable statement that something happened.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no | uuid v7 so that the primary key is time-ordered and the table is append-friendly without a separate sequence |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `audit_class` | enum | yes | yes | — | no | no |  |
| `actor_type` | enum | yes | yes | — | no | no |  |
| `actor_principal_id` | uuid | no | yes | — | no | no | resolved through the principal_directory port; null for system_scheduler |
| `authority_kind` | enum | yes | yes | — | no | no | the answer to "under what authority", which actor alone does not give |
| `authority_ref` | uuid | no | yes | — | no | no | the binding, delegation or impersonation grant id, resolved through the authorization_decision port |
| `on_behalf_of_principal_id` | uuid | no | yes | — | no | no | the delegator or the impersonated principal; non-null exactly when authority_kind is delegation or impersonation |
| `verb` | enum | yes | yes | — | no | no | from the closed vocabulary verb set |
| `capability_key` | string | yes | yes | — | no | no |  |
| `entity_key` | string | yes | yes | — | no | no |  |
| `subject_id` | uuid | no | yes | — | no | no | null for actions whose subject is the tenant itself, such as a configuration change |
| `subject_label_at_time` | string | no | yes | — | no | no | a denormalised human label captured at write time. Deliberately frozen - resolving the label at read time would show the CURRENT name, which is how an audit trail quietly rewrites history when a record is renamed |
| `before` | json | no | yes | — | no | no | present for the always and security classes on any state change or field change; absent for creates |
| `after` | json | no | yes | — | no | no | absent for deletes |
| `changed_field_keys` | json | no | yes | — | no | no | extracted at write time so that the common query - who touched this field - does not require scanning json |
| `reason` | text | no | yes | — | no | no | required by the verb where the vocabulary marks it so, for example a rejected approval |
| `source` | enum | yes | yes | — | no | no |  |
| `correlation_id` | uuid | yes | yes | — | no | no |  |
| `causation_id` | uuid | no | yes | — | no | no |  |
| `occurred_at` | timestamptz | yes | yes | — | no | no | business time - when the actor says it happened, which for an offline replay is when they did it on the device |
| `recorded_at` | timestamptz | yes | yes | — | no | no | system time - when the server accepted it. The two differ on offline replay and the gap is itself evidence |
| `ip` | inet | no | yes | — | yes | no |  |
| `device_id` | uuid | no | yes | — | no | no | resolved through the principal_directory port |
| `geo` | geo_point | no | yes | — | yes | no | captured only where the action declares evidence capture; never captured silently, because silent location capture of a workforce is both a legal and a trust problem |
| `record_hash` | string | yes | yes | — | no | no | SHA-256 over the canonical serialisation of every other field in this row plus the previous row hash for this tenant |
| `previous_record_hash` | string | no | yes | — | no | no | null only for the first row of a tenant |
| `retention_class` | enum | yes | no | — | no | no | derived from audit_class at write time and mutable ONLY by a legal hold, which is the single exception to immutability on this entity and is itself audited |

## 2. Lifecycle

States: `recorded`, `sealed`, `held`, `expired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `recorded` | GAP | GAP | GAP | entity-specific, see capability model |
| `sealed` | GAP | GAP | GAP | entity-specific, see capability model |
| `held` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. No update path and no delete path is exposed for any field except retention_class, and that field may only move toward legal_hold or back to its derived value when the hold is released.
2. on_behalf_of_principal_id is non-null exactly when authority_kind is delegation or impersonation. Any other combination is a modelling error and is rejected at write time.
3. before and after are recorded as the raw stored values, never as the permission-projected values. Projection happens on read. Recording the projection would mean the evidence depends on who happened to be looking when it was written.
4. The audit write participates in the same database transaction as the business write. There is no queue, no fire-and-forget and no best-effort path.
5. record_hash is computed over a canonical serialisation with a declared field order and a declared null encoding. An undeclared serialisation makes the chain unverifiable by anyone but the writer, which defeats its purpose.

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

- Permission matrix: `14-PERMISSIONS/core_audit/audit_record.md`
- Screen specifications: `11-UX/screens/core_audit/audit_record/`
- Test catalogue: `20-TESTING/core_audit/audit_record/`
