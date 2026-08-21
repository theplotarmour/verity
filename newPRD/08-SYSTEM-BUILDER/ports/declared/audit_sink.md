---
doc_id: PORTC-AUDIT_SINK
title: Port contract — audit_sink
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — audit_sink

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `core_audit`

**Cardinality:** `exactly_one`

Accept an audit record within the caller's transaction. The contract is deliberately synchronous and transactional. A provider that accepts asynchronously does not satisfy it, and this is what conformance test PC-01 checks.


## Consumers and their declared behaviour when unbound

### `core_identity_session`

**Cardinality:** `exactly_one`

Record authentication, session, membership and device events of audit class security within the calling transaction.

**When unbound.** FORBIDDEN. Authentication and permission-adjacent events are the first thing any investigation reads, and an unauditable identity subsystem cannot be relied on for anything else in the platform.

### `evidence_capture`

**Cardinality:** `exactly_one`

Record capture, upload, verification failure, redaction and expiry as audit events within the calling transaction.

**When unbound.** FORBIDDEN. An evidence store whose accesses and redactions are not audited is a store whose contents cannot be relied on.

### `hq_console`

**Cardinality:** `exactly_one`

Record every platform action, every impersonation and every deployment, in the tenant's own audit stream as well as the platform's.

**When unbound.** FORBIDDEN. Writing platform actions into the affected tenant's own audit stream is what makes support access visible to the customer, and support access a customer cannot see in their own trail is indistinguishable from an intrusion.


### `integrations`

**Cardinality:** `exactly_one`

Record connection changes, credential rotations, inbound calls, dead letters, replays and abandonments.

**When unbound.** FORBIDDEN. Integration is the boundary of the system and an unaudited boundary is one nobody can reason about after an incident.

### `notification`

**Cardinality:** `exactly_one`

Record sends, suppressions and preference overrides as audit events.

**When unbound.** FORBIDDEN. Whether somebody was told something is a question asked in every dispute, and an unaudited notification record can be edited.

### `offline_sync`

**Cardinality:** `exactly_one`

Record replay, conflict, rejection and abandonment as audit events, carrying both occurred_at and applied_at.

**When unbound.** FORBIDDEN. The gap between when something was done and when it was recorded is precisely what an offline dispute examines, and it exists only in the audit record.

### `reporting`

**Cardinality:** `exactly_one`

Record runs of sensitive or financial reports and every export.

**When unbound.** FORBIDDEN. Export is an exfiltration vector that the vocabulary already marks always-audited, and an unaudited export surface removes the only trace.

### `search`

**Cardinality:** `exactly_one`

Record queries touching sensitive or financial projections, and record any export from a result set.

**When unbound.** FORBIDDEN. Search is an exfiltration vector and the vocabulary already marks export as always-audited; an unaudited search surface removes the only trace.

## Generated provider conformance tests

**PC-01** A provider bound to `audit_sink` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `audit_sink` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `audit_sink` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

