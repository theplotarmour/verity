---
doc_id: ENT-NOTIFICATION_TEMPLATE
title: Entity — Template
generated: true
source_model: _model/capabilities/notification.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Template

*This document is generated. Edit `_model/capabilities/notification.yaml`, not this file.*

**Capability/module:** `notification` · **Owner scope:** `tenant`

A versioned, per-channel message with its variables, its cost class and, where a channel demands it, its external registration.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `key` | string | yes | yes | — | no | no |  |
| `version_number` | int | yes | no | — | no | no |  |
| `channel` | enum | yes | yes | — | no | no |  |
| `locale` | string | yes | no | — | no | no |  |
| `subject_text` | string | no | no | — | no | no |  |
| `body_text` | text | yes | no | — | no | no |  |
| `variables` | json | yes | no | — | no | no | flat list of variable keys the body uses. Declared rather than parsed, so a missing value is caught at render rather than sent as an empty gap in a sentence |
| `cost_class` | enum | yes | no | — | no | no | from the channel provider's own categories. This is a real money field and it drives both routing and the send-time cost record |
| `external_registration_id` | string | no | no | — | no | no | the registered template identifier where the channel requires one. Without it the send will be rejected by the provider, so it is checked before sending rather than discovered afterwards |
| `external_entity_id` | string | no | no | — | no | no | the registered sending entity identifier, held per tenant per channel |
| `external_header` | string | no | no | — | no | no | the registered sender identifier shown to the recipient |
| `registration_state` | enum | yes | no | — | no | no |  |
| `registration_rejection_reason` | text | no | no | — | no | no |  |
| `mandatory_class` | enum | yes | no | — | no | no | whether a recipient may suppress it. The list of things they may not suppress is deliberately short |
| `quiet_hours_exempt` | bool | yes | no | — | no | no |  |
| `max_length` | int | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `pending_registration`, `approved`, `rejected`, `superseded`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `pending_registration` | GAP | GAP | GAP | entity-specific, see capability model |
| `approved` | GAP | GAP | GAP | entity-specific, see capability model |
| `rejected` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A template is never edited after approval. A change is a new version requiring its own registration, because the registered text is what the provider matches against and an edited template silently fails to deliver.
2. registration_state=approved requires external_registration_id where the channel demands registration. A template that looks approved without an identifier will be rejected at send time by the provider, with an error the tenant cannot interpret.
3. mandatory_class other than none requires a stated justification recorded on the template, because the set of messages a person may not turn off is the set most likely to be abused.
4. quiet_hours_exempt true requires mandatory_class other than none. A routine message that ignores quiet hours is how a tenant teaches its workforce to disable notifications entirely.
5. Every variable referenced in body_text must appear in variables, checked at publication rather than at render.

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

- Permission matrix: `14-PERMISSIONS/notification/notification_template.md`
- Screen specifications: `11-UX/screens/notification/notification_template/`
- Test catalogue: `20-TESTING/notification/notification_template/`
