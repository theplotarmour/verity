---
doc_id: PORTC-SECRET_STORE
title: Port contract — secret_store
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — secret_store

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.secret_store.provider` · Capability: `secret_store`  
> **Blocks:** `capability:integrations`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `integrations`

**Cardinality:** `exactly_one`

Store, reference, rotate and revoke a credential, returning only a reference. No read path returns the secret to Verity or to any principal.

**When unbound.** FORBIDDEN. Holding credentials inside the application database, even encrypted, means the application can read them, and a capability that can read a credential is a capability that can leak it. Declared FORBIDDEN rather than degraded because the degraded form is the one every implementation reaches for.


## Generated provider conformance tests

**PC-01** A provider bound to `secret_store` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `secret_store` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `secret_store` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

