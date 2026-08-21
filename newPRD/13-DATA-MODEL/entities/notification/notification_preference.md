---
doc_id: ENT-NOTIFICATION_PREFERENCE
title: Entity — Preference
generated: true
source_model: _model/capabilities/notification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Preference

*This document is generated. Edit `_model/capabilities/notification.yaml`, not this file.*

**Capability/module:** `notification` · **Owner scope:** `tenant`

What one recipient wants, per category and per channel, including their quiet hours - with an explicit record of what they may not turn off.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `principal_id` | uuid | no | no | — | no | no |  |
| `party_ref` | uuid | no | no | — | no | no |  |
| `category_key` | string | yes | no | — | no | no | a grouping of templates a person can reason about, such as roster changes. Preferences are never per template, because a list of two hundred switches is a list nobody sets |
| `channel` | enum | yes | no | — | no | no |  |
| `enabled` | bool | yes | no | — | no | no |  |
| `digest_mode` | enum | yes | no | — | no | no |  |
| `quiet_hours_start` | time | no | no | — | no | no |  |
| `quiet_hours_end` | time | no | no | — | no | no |  |
| `timezone` | string | no | no | — | no | no | the recipient's own timezone, without which quiet hours are meaningless for anybody who does not share the tenant's |
| `set_by` | enum | yes | no | — | no | no |  |
| `set_at` | timestamptz | yes | no | — | no | no |  |

## 2. Lifecycle

States: `active`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. unique(tenant_id, principal_id or party_ref, category_key, channel).
2. A preference may not disable a category containing mandatory_operational or mandatory_legal templates. The attempt is recorded and the recipient is shown which messages they will continue to receive and why.
3. quiet_hours_start and quiet_hours_end require timezone. Quiet hours in an unstated timezone are quiet hours for somebody else.
4. A preference set by the recipient may not be overridden by an administrator without a recorded reason, and the recipient is told.

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

- Permission matrix: `14-PERMISSIONS/notification/notification_preference.md`
- Screen specifications: `11-UX/screens/notification/notification_preference/`
- Test catalogue: `20-TESTING/notification/notification_preference/`
