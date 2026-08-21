---
doc_id: PORT-PARTY_DIRECTORY
title: Port contract — party_directory
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Port contract — party_directory

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Direction:** `requires` · **Cardinality:** `exactly_one`

**Contract.** resolve a party reference to a display name, contactable channels, and a permission scope

**Declared by.** `work_order`, `booking`, `helpdesk`, `billing`, `attendance_verification`

**Behaviour when unbound.** FORBIDDEN. party is a kernel-adjacent capability and is always present. Declared here so the dependency is explicit rather than assumed.

## Generated provider conformance tests

**PC-01** A provider bound to `party_directory` satisfies every element of the contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `party_directory` unbound, every declaring capability behaves exactly as stated under *Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.

**PC-03** Rebinding `party_directory` from provider A to provider B leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

