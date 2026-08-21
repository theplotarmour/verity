---
doc_id: PORTC-PRINCIPAL_DIRECTORY
title: Port contract — principal_directory
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — principal_directory

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `core_identity_session`

**Cardinality:** `exactly_one`

Resolve a principal reference to a display name, an authentication status, the role archetypes it holds, whether its current session is elevated, and its devices with their trust state. Provide a change feed so that suspension, deactivation or membership revocation invalidates cached authorization decisions and blocks offline device stores. Eight capabilities consume this; it is the reason a notification, an audit row or a queued mutation can be attributed to a person years later.


## Consumers and their declared behaviour when unbound

### `core_audit`

**Cardinality:** `exactly_one`

Resolve an actor reference to a display name and status, and resolve a device reference to a label, for rendering an audit row that is readable years after the person left.

**When unbound.** FORBIDDEN. An audit trail that cannot name the actor is not an audit trail. Note that resolution failure at READ time - the principal was deleted by a retention job - is a different matter and is handled by subject_label_at_time-style denormalisation on the actor as well.


### `core_authorization`

**Cardinality:** `exactly_one`

Resolve a principal reference to a display name, an authentication status, the set of role archetypes it holds, and whether its current session is elevated. Provide a change feed so that a principal being suspended or deactivated invalidates cached authorization decisions.


**When unbound.** FORBIDDEN. Authorization without identity is meaningless. Declared explicitly rather than assumed so that the dependency appears in the composition graph, and so that a pack cannot be published that omits it.


### `core_configuration`

**Cardinality:** `exactly_one`

Resolve the principal who set a value, and resolve a user-scoped value's target principal.

**When unbound.** FORBIDDEN. A configuration change that cannot be attributed is not auditable, and configuration is one of the two surfaces an investigation always looks at first.

### `evidence_capture`

**Cardinality:** `exactly_one`

Resolve the capturing principal and device to display names and trust state.

**When unbound.** FORBIDDEN. Evidence with no attributable capturer is not evidence, and the identity of the person who took a photograph is frequently the first thing a dispute asks about.

### `hq_console`

**Cardinality:** `exactly_one`

Resolve platform principals and tenant principals, and provide the impersonation mechanism with its redaction profile.

**When unbound.** FORBIDDEN. Platform operation without identity is unauditable, and impersonation is the mechanism by which support works at all.

### `notification`

**Cardinality:** `exactly_one`

Resolve internal recipients, their devices for push, their role holdings for role-addressed audiences, and their availability.

**When unbound.** FORBIDDEN. Audience resolution by role is the mechanism that stops notifications dying when somebody leaves, and without a principal directory there is no role to resolve.

### `offline_sync`

**Cardinality:** `exactly_one`

Resolve the device and the principal, report device trust and block state, and report a principal being suspended or losing membership so the store can be blocked.

**When unbound.** FORBIDDEN. A queue belongs to a person on a device, and without either the work cannot be attributed or the store secured.

### `party`

**Cardinality:** `exactly_one`

Resolve relationship owners and record creators to a display name and status, and expose the departure of a principal so their owned relationships can be reported as unowned.

**When unbound.** FORBIDDEN. Party records without attributable authorship cannot be audited, and ownership is the mechanism by which anything in this capability gets looked after.

### `search`

**Cardinality:** `exactly_one`

Resolve the searching principal, their roles and their devices for surface-specific behaviour.

**When unbound.** FORBIDDEN. There is no scope to filter by without a principal.

## Generated provider conformance tests

**PC-01** A provider bound to `principal_directory` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `principal_directory` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `principal_directory` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

