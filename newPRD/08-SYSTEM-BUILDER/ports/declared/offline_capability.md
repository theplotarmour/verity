---
doc_id: PORTC-OFFLINE_CAPABILITY
title: Port contract — offline_capability
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — offline_capability

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `offline_sync`

**Cardinality:** `exactly_one`

Declare a local dataset scope, queue a mutation with its base version, its idempotency key, its evidence and its atomic group, and receive the outcome. Every field capability consumes this rather than implementing its own queue, so that conflict semantics, attribution and observability are uniform.


## Consumers and their declared behaviour when unbound

No capability in the library requires this port.

## Generated provider conformance tests

**PC-01** A provider bound to `offline_capability` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `offline_capability` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `offline_capability` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

