---
doc_id: PORTC-PROCUREMENT_SOURCE
title: Port contract — procurement_source
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — procurement_source

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `procurement`

**Cardinality:** `zero_or_one`

Resolve a receipt to its commitment, its supplier and the expected quantities and unit costs, so a receipt can be matched rather than merely recorded.

## Consumers and their declared behaviour when unbound

### `inventory`

**Cardinality:** `zero_or_one`

Resolve a receipt to its purchase order, its supplier and its expected quantities and costs, so that a receipt can be matched rather than merely recorded.

**When unbound.** Receipts are recorded with a free-text source and a manually entered cost. Nothing is matched, so over-receipt and price variance cannot be detected. The stock is correct and the commercial control is absent, and the receipt surface says so.

## Generated provider conformance tests

**PC-01** A provider bound to `procurement_source` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `procurement_source` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `procurement_source` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

