---
doc_id: PORTC-MESSAGE_TRANSPORT
title: Port contract — message_transport
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — message_transport

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.message_transport.provider` · Capability: `message_transport`  
> **Blocks:** `capability:notification`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `notification`

**Cardinality:** `zero_or_many`

Submit a rendered message on a channel and return a provider reference, a cost where the provider reports one, and asynchronous delivery receipts. Report permanent versus transient failure distinguishably, because the two demand different behaviour.


**When unbound.** Only in-app delivery works, which requires the recipient to open the application. Every other capability's unbound-notification degradation applies simultaneously. The tenant surface states plainly which channels are unavailable rather than offering them and failing, because an offered channel that silently fails is worse than an absent one.


## Generated provider conformance tests

**PC-01** A provider bound to `message_transport` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `message_transport` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `message_transport` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

