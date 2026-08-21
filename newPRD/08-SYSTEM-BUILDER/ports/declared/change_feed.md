---
doc_id: PORTC-CHANGE_FEED
title: Port contract — change_feed
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — change_feed

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.change_feed.provider` · Capability: `change_feed`  
> **Blocks:** `capability:integrations`, `capability:reporting`, `capability:search`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `integrations`

**Cardinality:** `exactly_one`

A durable, ordered stream of platform events with a cursor, so outbound delivery is derived from committed state rather than from in-process hooks.

**When unbound.** FORBIDDEN. Emitting outbound messages from in-process hooks means an event is sent for a transaction that later rolls back, and the far side then holds a record of something that did not happen. This is the same change feed the search capability requires and its absence from the composition model is flagged there and here.


### `reporting`

**Cardinality:** `zero_or_one`

A durable, ordered stream of changes with a cursor, so aggregates can be maintained incrementally and their freshness measured.

**When unbound.** Aggregates are computed on demand against the operational store rather than maintained incrementally. Correct, materially slower, and it puts reporting queries on the same database as operational transactions - which is why interactive runs carry a short timeout and why the row limit exists. This is the same change feed search and integrations require, and its absence from the composition model is flagged in all three.


### `search`

**Cardinality:** `exactly_one`

A durable, ordered stream of entity changes from every capability, carrying the entity key, the identifier and a change cursor, so the index can be maintained incrementally and its lag measured.

**When unbound.** FORBIDDEN in practice. Without a change feed the index can only be rebuilt periodically, which means results are hours stale and a record created a minute ago cannot be found - which is precisely when people search for it. Declared FORBIDDEN rather than degraded, because a search that cannot find recent records trains people not to use it.


## Generated provider conformance tests

**PC-01** A provider bound to `change_feed` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `change_feed` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `change_feed` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

