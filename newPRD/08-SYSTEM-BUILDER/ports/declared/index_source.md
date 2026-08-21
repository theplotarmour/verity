---
doc_id: PORTC-INDEX_SOURCE
title: Port contract — index_source
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — index_source

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.index_source.provider` · Capability: `index_source`  
> **Blocks:** `capability:lease_management`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `lease_management`

**Cardinality:** `zero_or_one`

Resolve a published index key and a reference date to a published value, and report whether a value is published, provisional or revised.

**When unbound.** Index-linked escalations cannot be computed and are held, with the accrued under-recovery shown. Values may be entered manually, which works and puts a number somebody typed at the base of every subsequent charge - so a manually entered value records who entered it and from what source.


## Generated provider conformance tests

**PC-01** A provider bound to `index_source` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `index_source` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `index_source` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

