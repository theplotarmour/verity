---
doc_id: PORTC-OCCUPIABLE_SPACE
title: Port contract — occupiable_space
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — occupiable_space

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.occupiable_space.provider` · Capability: `occupiable_space`  
> **Blocks:** `capability:lease_management`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `lease_management`

**Cardinality:** `exactly_one`

Resolve a space reference to a display label, its position in a hierarchy, its measured area on each available basis, and its availability over a date range. The space is opaque here, which is what stops this capability becoming a second location model.


**When unbound.** FORBIDDEN. A lease is an agreement to occupy something. Without a space provider there is nothing to occupy, no overlap detection is possible, and double-letting becomes undetectable until two counterparties arrive at the same place.


## Generated provider conformance tests

**PC-01** A provider bound to `occupiable_space` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `occupiable_space` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `occupiable_space` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

