---
doc_id: ENT-CALENDAR_EXCEPTION
title: Entity — Calendar Exception
generated: true
source_model: _model/capabilities/sites.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Calendar Exception

*This document is generated. Edit `_model/capabilities/sites.yaml`, not this file.*

**Capability/module:** `sites` · **Owner scope:** `tenant`

A specific date or range where a location's hours differ from its pattern - a holiday, a shutdown, an extended opening.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `calendar_id` | uuid | yes | no | — | no | no |  |
| `starts_on` | date | yes | no | — | no | no |  |
| `ends_on` | date | yes | no | — | no | no |  |
| `kind` | enum | yes | no | — | no | no | premium_period is deliberately named for what it is - a period the tenant treats differently - rather than for any particular reason it might be treated differently |
| `open_time` | time | no | no | — | no | no |  |
| `close_time` | time | no | no | — | no | no |  |
| `label` | string | yes | no | — | no | no |  |
| `source` | enum | yes | no | — | no | no |  |

## 2. Lifecycle

States: `active`, `superseded`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `active` | False | True | True | In normal operational use. |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. ends_on >= starts_on.
2. Overlapping exceptions on one calendar are permitted, and the narrower period wins, with same-width overlaps rejected at write time. Silently choosing between two equally specific exceptions is how a location is reported closed and open on the same day.
3. An exception may never be edited after any operational record has resolved against it. Later corrections create a new exception and the affected records are listed for review rather than silently re-resolved.

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

- Permission matrix: `14-PERMISSIONS/sites/calendar_exception.md`
- Screen specifications: `11-UX/screens/sites/calendar_exception/`
- Test catalogue: `20-TESTING/sites/calendar_exception/`
