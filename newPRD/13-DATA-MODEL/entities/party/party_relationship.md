---
doc_id: ENT-PARTY_RELATIONSHIP
title: Entity — Party Relationship
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Party Relationship

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

**Capability/module:** `party` · **Owner scope:** `tenant`

The capacity in which a party stands to the tenant - counterparty, supplier, workforce member, portal user - each with its own lifecycle and its own owner.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `party_id` | uuid | yes | no | — | no | no |  |
| `relationship_kind` | enum | yes | no | — | no | no | deliberately generic. A pack maps these to the words a given business uses through the terminology map; the capability never learns those words |
| `relationship_owner_principal_id` | uuid | no | no | — | no | no | resolved through the principal_directory port. Null means unowned, which is a real and reportable condition |
| `started_at` | date | yes | no | — | no | no |  |
| `ended_at` | date | no | no | — | no | no |  |
| `end_reason` | text | no | no | — | no | no |  |
| `external_ref` | string | no | no | — | no | no | the identifier the party themselves uses for this relationship, such as their own vendor code for the tenant |
| `parent_relationship_id` | uuid | no | no | — | no | no | for an organisation with divisions that trade separately but bill centrally. Self-referential within this capability, which is legal; a cross-capability parent would not be |

## 2. Lifecycle

States: `prospective`, `active`, `suspended`, `ended`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `prospective` | GAP | GAP | GAP | entity-specific, see capability model |
| `active` | False | True | True | In normal operational use. |
| `suspended` | GAP | GAP | GAP | entity-specific, see capability model |
| `ended` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. A party may hold several relationships of different kinds simultaneously, and at most one active relationship of each kind. Two live supplier relationships with one party is two ledgers for one counterparty.
2. ended_at requires end_reason. A relationship that ended for no recorded reason is a relationship nobody can explain to the party when they call.
3. parent_relationship_id may only point at a relationship of the same kind belonging to a party of kind=organisation. A person cannot be the parent of a trading division.

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

- Permission matrix: `14-PERMISSIONS/party/party_relationship.md`
- Screen specifications: `11-UX/screens/party/party_relationship/`
- Test catalogue: `20-TESTING/party/party_relationship/`
