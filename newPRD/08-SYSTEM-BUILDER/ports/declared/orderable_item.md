---
doc_id: PORTC-ORDERABLE_ITEM
title: Port contract — orderable_item
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — orderable_item

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `catalog`

**Cardinality:** `exactly_one`

Resolve an item and a set of selected options to a display label, a unit, a resolved price with its rule provenance, a duration, a tax classification and an availability verdict for a given location, channel and instant. Provenance is part of the contract - a consumer that cannot say which rule produced a price cannot answer the only question anybody asks about it.


## Consumers and their declared behaviour when unbound

### `billing`

**Cardinality:** `zero_or_one`

Resolve an item to its description, unit, tax classification and applicable price rules for rating.

**When unbound.** Rating uses only billing-owned rate rules. Outcomes referencing catalogue items rate by their carried description and unit, and tax classification must be set per rate rule. This works and duplicates catalogue knowledge in two places, which is stated because the duplication will drift.

### `inventory`

**Cardinality:** `exactly_one`

Resolve an item to its unit of measure, whether it is stocked, its composition and its shelf-life behaviour.

**When unbound.** FORBIDDEN. Stock is quantities of catalogued things. Without a catalogue there is nothing to hold, and free-text stock lines cannot be consumed, valued or counted.

### `kitchen_flow`

**Cardinality:** `zero_or_one`

Resolve a line to its display label, its routing tags, its expected preparation duration and its composition where components are consumed.

**When unbound.** Lines arrive carrying their own display text and tags from the source, and no expected duration is known, so timers run without an expectation and every overrun alert falls back to the fixed threshold. This works and loses the projected-lateness monitor, which is the most valuable thing this capability computes.


### `order`

**Cardinality:** `exactly_one`

Resolve an item and selected options to a label, a unit, a price with its rule provenance, a duration, a tax classification and an availability verdict for a location, channel and instant.

**When unbound.** FORBIDDEN. An order is a request for things. With no catalogue there is nothing to request, and free-text ordering would produce lines that cannot be priced, routed, taxed or reported.

### `procurement`

**Cardinality:** `zero_or_one`

Resolve an item to its unit of measure, its tax classification and its typical suppliers.

**When unbound.** Every line is free text with a manually entered unit and no tax classification. Matching still works on quantity and price. This is deliberately supported rather than degraded, because a large share of what these businesses buy will never be catalogued.

## Generated provider conformance tests

**PC-01** A provider bound to `orderable_item` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `orderable_item` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `orderable_item` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

