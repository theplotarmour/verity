---
doc_id: PORTC-CONTRACT_TERMS
title: Port contract — contract_terms
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — contract_terms

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `lease_management`

**Cardinality:** `zero_or_many`

Expose a lease as a contract with its parties, its term, its charge basis and its obligations, so that any capability consuming contract terms can resolve one.

## Consumers and their declared behaviour when unbound

### `billing`

**Cardinality:** `zero_or_one`

Resolve a contract to its agreed rates, billing basis, billing cycle, payment terms and any penalty obligations to be applied.

**When unbound.** Rating falls back to catalogue and party-scoped rates only. Contracted rates must be maintained as party-scoped rate rules by hand, which works and drifts from the contract. Penalty obligations raised by the contract capability cannot be applied automatically and appear as an outstanding list.


### `catalog`

**Cardinality:** `zero_or_one`

Resolve a contract reference to its agreed prices and discounts for this tenant and party.

**When unbound.** Contract-scoped price rules cannot be created. Agreed prices must be entered as party-scoped rules manually, which works and drifts from the contract over time. The drift is the cost of leaving this unbound and is stated in the port doc.

## Generated provider conformance tests

**PC-01** A provider bound to `contract_terms` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `contract_terms` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `contract_terms` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

