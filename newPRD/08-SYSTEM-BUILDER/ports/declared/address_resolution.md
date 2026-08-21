---
doc_id: PORTC-ADDRESS_RESOLUTION
title: Port contract — address_resolution
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — address_resolution

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.address_resolution.provider` · Capability: `address_resolution`  
> **Blocks:** `capability:party`, `capability:sites`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `party`

**Cardinality:** `zero_or_one`

Normalise, validate and geocode a postal address, and resolve it to a serviceable location.

**When unbound.** Addresses are stored as free text exactly as entered, are not geocoded, and are excluded from any distance-based matching rule. Duplicate detection falls back to the non-address rules and says so on the proposal, so a reviewer knows the score was computed with one hand tied.

### `sites`

**Cardinality:** `zero_or_one`

Normalise and geocode an address to a position with a stated accuracy, and reverse-geocode a position to a human-readable address.

**When unbound.** Addresses are stored verbatim and positions must be set manually by dropping a pin. A location with no position cannot carry a geofence, and the geofence UI states that reason rather than simply being unavailable. This degradation is important to state plainly because it silently disables presence evidence everywhere downstream.


## Generated provider conformance tests

**PC-01** A provider bound to `address_resolution` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `address_resolution` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `address_resolution` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

