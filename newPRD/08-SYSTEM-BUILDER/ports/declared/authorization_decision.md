---
doc_id: PORTC-AUTHORIZATION_DECISION
title: Port contract — authorization_decision
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — authorization_decision

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `core_authorization`

**Cardinality:** `exactly_one`

Given a principal, a tenant, a verb, an entity, an optional subject and a requested field set, return allow or deny, the projected field set, and the reason code. The reason code is for the audit stream and for support tooling; it is never returned to an external caller, because a reason code is a description of the permission model.


## Consumers and their declared behaviour when unbound

### `core_audit`

**Cardinality:** `exactly_one`

Given an audit row and a reader, return which fields of before and after the reader may see, and whether the reader may see the row at all.

**When unbound.** FORBIDDEN. Without permission projection the audit trail becomes the platform's largest data-exfiltration surface - it contains the before and after of every field including the ones the reader is gated out of.


### `core_configuration`

**Cardinality:** `exactly_one`

Determine whether the acting principal may set a given key at a given scope, and project sensitive and financial settings out of a reader's view.

**When unbound.** FORBIDDEN. Configuration includes financial and security-affecting settings and cannot be exposed without projection.

### `core_identity_session`

**Cardinality:** `exactly_one`

Resolve whether an acting principal may perform an identity action against a target, and resolve the impersonation redaction profile.

**When unbound.** FORBIDDEN. Every administrative action here - suspend, deactivate, revoke, block, impersonate - is a permission decision, and an unauthorised identity subsystem is an unauthenticated one.

### `evidence_capture`

**Cardinality:** `exactly_one`

Determine whether a reader may see an item, applying the sensitive gate and the subject-visibility rule.

**When unbound.** FORBIDDEN. Evidence includes photographs of people and identity documents, and serving it unprojected would make this the platform's largest disclosure surface.

### `hq_console`

**Cardinality:** `exactly_one`

Evaluate platform-scoped permissions and enforce that a support impersonation is an INTERSECTION with a redaction profile rather than a grant of the target's full access.

**When unbound.** FORBIDDEN. This is the one capability whose principals are not tenant-bound, and unbounded cross-tenant access is the worst failure available in the platform.

### `integrations`

**Cardinality:** `exactly_one`

Authorise an inbound call under the connection's acting principal, and resolve the redaction set for an outbound subscriber.

**When unbound.** FORBIDDEN. An inbound write with no authorisation is an unauthenticated write with extra steps, and an outbound payload with no redaction resolution sends every field to every subscriber.

### `offline_sync`

**Cardinality:** `exactly_one`

Resolve the principal's scope for the local dataset, and re-evaluate permission at replay time rather than trusting the permission that applied when the mutation was made.

**When unbound.** FORBIDDEN. Re-evaluating permission at replay is what stops a mutation made before a permission was revoked from applying afterwards, and it is the single control that makes an offline queue safe to hold across a permission change.


### `reporting`

**Cardinality:** `exactly_one`

Resolve a reader's scope filter for each source and project both rows and aggregates.

**When unbound.** FORBIDDEN. An aggregate over records a reader may not see is a disclosure that is harder to notice than a row, because nobody expects a total to leak.

### `search`

**Cardinality:** `exactly_one`

Resolve a principal's scope filter for an entity, and re-check a resolved identifier set before it is returned.

**When unbound.** FORBIDDEN. Search without permission resolution is the platform's largest disclosure surface, because it reaches across every capability at once and returns exactly the records a person was curious about.


## Generated provider conformance tests

**PC-01** A provider bound to `authorization_decision` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `authorization_decision` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `authorization_decision` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

