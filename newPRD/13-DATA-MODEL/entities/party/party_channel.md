---
doc_id: ENT-PARTY_CHANNEL
title: Entity — Party Channel
generated: true
source_model: _model/capabilities/party.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Party Channel

*This document is generated. Edit `_model/capabilities/party.yaml`, not this file.*

**Capability/module:** `party` · **Owner scope:** `tenant`

One way of reaching a party, with its own verification state and its own per-purpose consent.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `party_id` | uuid | yes | no | — | no | no |  |
| `channel_kind` | enum | yes | no | — | no | no |  |
| `value` | string | yes | no | — | yes | no |  |
| `label` | string | no | no | — | no | no | the human distinction between two numbers, which is what makes a picker usable |
| `is_primary` | bool | yes | no | — | no | no |  |
| `verified_at` | timestamptz | no | no | — | no | no |  |
| `verification_method` | enum | yes | no | — | no | no |  |
| `consent_marketing` | enum | yes | no | — | no | no |  |
| `consent_transactional` | enum | yes | no | — | no | no | separate from marketing because the legal and practical basis differ. A person who refuses marketing has not refused a delivery notification |
| `consent_recorded_at` | timestamptz | no | no | — | no | no |  |
| `consent_evidence_ref` | string | no | no | — | no | no | reference through the evidence_capture port to the recording of how consent was obtained |
| `bounce_count` | int | yes | no | — | no | no |  |
| `last_successful_delivery_at` | timestamptz | no | no | — | no | no |  |
| `suppressed_at` | timestamptz | no | no | — | no | no | set when the channel is suppressed for hard bounces or an opt-out received on the channel itself |

## 2. Lifecycle

States: `unverified`, `verified`, `suppressed`, `retired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `unverified` | GAP | GAP | GAP | entity-specific, see capability model |
| `verified` | GAP | GAP | GAP | entity-specific, see capability model |
| `suppressed` | GAP | GAP | GAP | entity-specific, see capability model |
| `retired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. At most one is_primary per (party_id, channel_kind). A picker with two primaries is a picker nobody trusts.
2. consent_marketing=granted requires consent_recorded_at and consent_evidence_ref. A consent nobody can evidence is a consent that will not survive a complaint.
3. A suppressed channel is never selected by any automated send, regardless of consent. Suppression is stronger than consent because it reflects delivery reality rather than intent.
4. value is normalised on write per channel_kind - e164 for phone kinds, lowercased for email - because duplicate detection over unnormalised contact values finds nothing.

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

- Permission matrix: `14-PERMISSIONS/party/party_channel.md`
- Screen specifications: `11-UX/screens/party/party_channel/`
- Test catalogue: `20-TESTING/party/party_channel/`
