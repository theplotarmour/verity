---
doc_id: ENT-TENANT_MANIFEST
title: Entity — Tenant Manifest
generated: true
source_model: _model/capabilities/hq_console.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Tenant Manifest

*This document is generated. Edit `_model/capabilities/hq_console.yaml`, not this file.*

**Capability/module:** `hq_console` · **Owner scope:** `platform`

The single resolved, versioned artifact that fully describes what one tenant is running - capabilities, packs, port bindings, configuration deltas, roles, navigation and a schema fingerprint.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `manifest_version` | int | yes | yes | — | no | no |  |
| `generated_at` | timestamptz | yes | yes | — | no | no |  |
| `generated_by_principal_id` | uuid | yes | yes | — | no | no |  |
| `capability_versions` | json | yes | yes | — | no | no | flat list of capability key and exact resolved version |
| `pack_versions` | json | yes | yes | — | no | no |  |
| `port_bindings` | json | yes | yes | — | no | no | every binding INCLUDING deliberate null bindings. A null binding recorded explicitly is the difference between a decision and an omission |
| `configuration_deltas` | json | yes | yes | — | no | no | every value differing from default, with the scope it was set at and who set it |
| `rule_overrides` | json | yes | yes | — | no | no | each with the rule's overridable_at, proving the override was legal at the time it was made |
| `role_expansions` | json | yes | yes | — | no | no |  |
| `navigation_tree` | json | yes | yes | — | no | no |  |
| `workflow_versions` | json | yes | yes | — | no | no |  |
| `integration_bindings` | json | yes | yes | — | no | no | credential references only, never credentials |
| `schema_fingerprint` | string | yes | yes | — | no | no | hash of the resolved data definition, used for drift detection |
| `deployed_at` | timestamptz | no | no | — | no | no |  |
| `superseded_at` | timestamptz | no | no | — | no | no |  |
| `last_reconciled_at` | timestamptz | no | no | — | no | no |  |
| `drift_findings` | json | no | no | — | no | no | what the running system does that this manifest does not describe |

## 2. Lifecycle

States: `generated`, `staged`, `deployed`, `superseded`, `failed`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `generated` | GAP | GAP | GAP | entity-specific, see capability model |
| `staged` | GAP | GAP | GAP | entity-specific, see capability model |
| `deployed` | GAP | GAP | GAP | entity-specific, see capability model |
| `superseded` | GAP | GAP | GAP | entity-specific, see capability model |
| `failed` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A manifest is immutable once deployed. A change produces a new version. Editing a deployed manifest means the artifact no longer describes what is running, which removes the only reason it exists.
2. manifest_version is contiguous per tenant. A gap means a manifest was generated and lost.
3. port_bindings records every requires-port of every enabled capability, including those bound to null. An omitted binding and a deliberate null binding are different facts and only one of them is a decision.
4. rule_overrides records the overridable_at that made each override legal. An override whose legality cannot be reconstructed cannot be re-evaluated at upgrade.
5. integration_bindings hold credential references and never credentials. A manifest is diffable, exportable and frequently read by support, and a manifest containing a secret is a secret in every one of those places.
6. Drift is recorded and never auto-corrected. An automatic correction can overwrite an emergency intervention somebody made at three in the morning for a reason the manifest does not know.

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

- Permission matrix: `14-PERMISSIONS/hq_console/tenant_manifest.md`
- Screen specifications: `11-UX/screens/hq_console/tenant_manifest/`
- Test catalogue: `20-TESTING/hq_console/tenant_manifest/`
