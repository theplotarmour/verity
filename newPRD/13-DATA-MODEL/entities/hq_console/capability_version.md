---
doc_id: ENT-CAPABILITY_VERSION
title: Entity — Capability Version
generated: true
source_model: _model/capabilities/hq_console.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Capability Version

*This document is generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

**Capability/module:** `hq_console` · **Owner scope:** `platform`

One published version of one capability in the library, with what changed, whether the change is breaking, and which tenants are on it.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `capability_key` | string | yes | yes | — | no | no |  |
| `semver` | string | yes | yes | — | no | no |  |
| `is_breaking` | bool | yes | no | — | no | no | derived from the composition model's breaking-change definition and recorded rather than judged per release, so that the same change is always classified the same way |
| `breaking_reasons` | json | no | no | — | no | no | flat list drawn from the declared set - a removed field, a narrowed permission default, an event payload change without a parallel version, a lifecycle change stranding an instance |
| `released_at` | timestamptz | no | no | — | no | no |  |
| `deprecates_version` | string | no | no | — | no | no |  |
| `migration_required` | bool | yes | no | — | no | no |  |
| `migration_is_reversible` | bool | no | no | — | no | no | nullable and NEVER defaulted to true. Where the rollback strategy is unresolved the honest value is unknown, and a null renders as unknown rather than as reversible |
| `override_impact_summary` | json | no | no | — | no | no | which tenant override kinds this version invalidates, computed at publication against every live override |
| `tenant_count_on_version` | int | yes | no | — | no | no |  |
| `known_issues` | text | no | no | — | no | no |  |

## 2. Lifecycle

States: `draft`, `released`, `deprecated`, `withdrawn`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `draft` | False | True | False | Created but not committed. Invisible to downstream modules. |
| `released` | GAP | GAP | GAP | entity-specific, see capability model |
| `deprecated` | GAP | GAP | GAP | entity-specific, see capability model |
| `withdrawn` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. semver is immutable and a published version is never republished. A version that can change content is a version number that means nothing.
2. is_breaking is derived from the declared definition rather than judged per release. A per-release judgement means the same change is breaking in one release and not in another.
3. migration_is_reversible is nullable and may never be defaulted to true. The platform's rollback strategy is an unresolved kernel decision, and claiming reversibility that has not been established would be a promise the platform cannot keep.
4. Publication computes override_impact_summary against every live tenant override. A version published without knowing which tenants it breaks is a version whose upgrade is discovered tenant by tenant, at their expense.

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

- Permission matrix: `14-PERMISSIONS/hq_console/capability_version.md`
- Screen specifications: `11-UX/screens/hq_console/capability_version/`
- Test catalogue: `20-TESTING/hq_console/capability_version/`
