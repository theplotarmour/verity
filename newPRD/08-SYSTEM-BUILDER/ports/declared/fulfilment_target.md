---
doc_id: PORTC-FULFILMENT_TARGET
title: Port contract — fulfilment_target
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — fulfilment_target

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.fulfilment_target.provider` · Capability: `fulfilment_target`  
> **Blocks:** `capability:order`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `order`

**Cardinality:** `zero_or_one`

Resolve a destination reference to a label and a serviceable position, and state whether a destination is required for this order's channel.

**When unbound.** Orders carry no destination and are implicitly collected or consumed where they were taken. Any channel requiring a destination cannot be enabled, which is a pack publication concern rather than a runtime surprise.

## Generated provider conformance tests

**PC-01** A provider bound to `fulfilment_target` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `fulfilment_target` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `fulfilment_target` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

