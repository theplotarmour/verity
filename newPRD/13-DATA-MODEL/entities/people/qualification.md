---
doc_id: ENT-QUALIFICATION
title: Entity — Qualification
generated: true
source_model: _model/capabilities/people.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Qualification

*This document is generated. Edit `_model/capabilities/people.yaml`, not this file.*

**Capability/module:** `people` · **Owner scope:** `tenant`

A competence, certification, clearance or check that a person holds, with a validity period and evidence.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `member_id` | uuid | yes | no | — | no | no |  |
| `qualification_type_id` | uuid | yes | no | — | no | no |  |
| `reference` | string | no | no | — | yes | no | the issuing body's reference. Sensitive because it is frequently a personal identifier |
| `issued_on` | date | no | no | — | no | no |  |
| `valid_from` | date | yes | no | — | no | no |  |
| `valid_to` | date | no | no | — | no | no | null means it does not expire, which is legal only where the qualification_type declares never_expires. Otherwise a null here is a validation error rather than a permanent qualification |
| `evidence_ref` | string | no | no | — | no | no | reference through the evidence_capture port to the stored document |
| `verified_by_principal_id` | uuid | no | no | — | no | no | resolved through the principal_directory port |
| `verified_at` | timestamptz | no | no | — | no | no |  |
| `verification_method` | enum | yes | no | — | no | no | issuer_checked is materially stronger than document_seen and the two must never be conflated, because a forged document passes one and not the other |

## 2. Lifecycle

States: `claimed`, `verified`, `expiring`, `expired`, `revoked`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `claimed` | GAP | GAP | GAP | entity-specific, see capability model |
| `verified` | GAP | GAP | GAP | entity-specific, see capability model |
| `expiring` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |
| `revoked` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. valid_to is required unless the qualification_type declares never_expires. A qualification with an unexplained open-ended validity is one nobody will ever re-check.
2. valid_to >= valid_from.
3. A qualification marked mandatory_for_engagement by its type may not be missing while the member is active. Enforced at activation and re-evaluated on expiry.
4. verification_method=none is permitted and is always visible wherever the qualification is shown. An unverified qualification that renders identically to a verified one is worse than no record.

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

- Permission matrix: `14-PERMISSIONS/people/qualification.md`
- Screen specifications: `11-UX/screens/people/qualification/`
- Test catalogue: `20-TESTING/people/qualification/`
