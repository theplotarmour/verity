---
doc_id: PORT-CUSTOMER_SURFACE
title: Port contract — customer_surface
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Port contract — customer_surface

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Direction:** `provides` · **Cardinality:** `zero_or_one`

**Contract.** a permissioned external projection of a subset of entities

**Declared by.** `client_portal`, `consumer_web`, `whatsapp_conversational`

**Behaviour when unbound.** GAP

## Generated provider conformance tests

**PC-01** A provider bound to `customer_surface` satisfies every element of the contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `customer_surface` unbound, every declaring capability behaves exactly as stated under *Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.

**PC-03** Rebinding `customer_surface` from provider A to provider B leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

