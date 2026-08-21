---
doc_id: ENT-INBOUND_REQUEST
title: Entity — Inbound Request
generated: true
source_model: _model/capabilities/integrations.yaml
confidence: see body
regenerate_with: python3 _tools/generate.py
---

# Entity — Inbound Request

*This document is generated. Edit `_model/capabilities/integrations.yaml`, not this file.*

**Capability/module:** `integrations` · **Owner scope:** `tenant`

One call from an external system into Verity, with what was sent, what was made of it, and whether it was a repeat.

## 1. Field specification

| Field | Type | Required | Immutable | Unique | Sensitive | Financial | Notes |
|---|---|---|---|---|---|---|---|
| `id` | uuid | yes | yes | — | no | no |  |
| `tenant_id` | uuid | yes | yes | — | no | no |  |
| `connection_id` | uuid | no | no | — | no | no | null where the caller could not be attributed to a configured connection, which is itself a finding |
| `received_at` | timestamptz | yes | yes | — | no | no |  |
| `source_ip` | inet | no | no | — | yes | no |  |
| `external_event_id` | string | no | no | — | no | no | the caller's own identifier for the event, used for deduplication where they provide one |
| `idempotency_key` | string | no | no | — | no | no | the caller-supplied key. Where present, the first response for that key is stored and replayed for repeats, including a failure response |
| `signature_verified` | bool | yes | no | — | no | no |  |
| `payload_excerpt` | text | no | no | — | yes | no | a bounded excerpt retained for diagnosis; the full body is retained only where the connector declares it necessary and for a shorter period |
| `payload_hash` | string | yes | no | — | no | no |  |
| `mapped_action` | string | no | no | — | no | no |  |
| `outcome` | enum | yes | no | — | no | no |  |
| `outcome_detail` | text | no | no | — | no | no |  |
| `response_status` | int | yes | no | — | no | no |  |
| `replayed_response` | bool | yes | no | — | no | no | whether the response was served from the idempotency record rather than freshly computed |
| `processing_ms` | int | yes | no | — | no | no |  |

## 2. Lifecycle

States: `received`, `processed`, `quarantined`, `expired`

| State | Terminal | Mutable | Counts toward billing | Definition |
|---|---|---|---|---|
| `received` | GAP | GAP | GAP | entity-specific, see capability model |
| `processed` | GAP | GAP | GAP | entity-specific, see capability model |
| `quarantined` | GAP | GAP | GAP | entity-specific, see capability model |
| `expired` | GAP | GAP | GAP | entity-specific, see capability model |

## 3. Invariants

1. Every inbound request is recorded including rejected ones. A rejected call that leaves no trace is how a misconfigured integration goes unnoticed for a quarter while the far side believes it is sending data.
2. A caller-supplied idempotency key causes the first response - including a failure response - to be stored and replayed for repeats within the key's lifetime. Replaying only successes means a caller retrying after a 500 gets a different answer each time and can never converge.
3. signature_verified false on a connection requiring signatures produces outcome rejected_signature and no processing. Verification precedes parsing, always.
4. Payload excerpts are gated by view_sensitive and are retained for a bounded period, because an inbound body can contain anything the far side chose to send.
5. An inbound write executes under the connection's acting_principal_id and is authorised exactly as any other principal would be. An integration never has implicit authority.

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

- Permission matrix: `14-PERMISSIONS/integrations/inbound_request.md`
- Screen specifications: `11-UX/screens/integrations/inbound_request/`
- Test catalogue: `20-TESTING/integrations/inbound_request/`
