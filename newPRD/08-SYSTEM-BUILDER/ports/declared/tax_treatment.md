---
doc_id: PORTC-TAX_TREATMENT
title: Port contract — tax_treatment
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — tax_treatment

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.tax_treatment.provider` · Capability: `tax_treatment`  
> **Blocks:** `capability:billing`, `capability:catalog`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `billing`

**Cardinality:** `zero_or_one`

Given a tax classification, the supplier and counterparty registration status, the place of supply and a date, return the treatment, the rate and the breakdown required on the document.

**When unbound.** tax_total_minor stays null and every document is produced with no tax breakdown and an explicit statement that tax has not been computed. Deliberately null rather than zero - a document showing zero tax asserts that no tax is due, which is a statement the tenant may not be entitled to make.


### `catalog`

**Cardinality:** `zero_or_one`

Given a tax classification, a location, a party's registration status and a date, return the applicable treatment and rate.

**When unbound.** Items carry their classification and no rate is computed. Prices resolve as tax-exclusive or tax-inclusive exactly as authored, and any document produced downstream shows no tax breakdown. The classification is still recorded, so binding a tax engine later works without re-cataloguing. Deliberately not an error - a tenant below a registration threshold genuinely has no tax to compute.


## Generated provider conformance tests

**PC-01** A provider bound to `tax_treatment` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `tax_treatment` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `tax_treatment` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

