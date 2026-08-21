---
doc_id: PORTC-SESSION_AUTHORITY
title: Port contract — session_authority
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — session_authority

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `core_identity_session`

**Cardinality:** `exactly_one`

Validate a session token to a principal, a tenant, a device and a surface; report its idle and absolute expiry and its elevation window; and revoke it. Expiry is evaluated server-side only, because device clocks are wrong.


## Consumers and their declared behaviour when unbound

No capability in the library requires this port.

## Generated provider conformance tests

**PC-01** A provider bound to `session_authority` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `session_authority` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `session_authority` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

