---
doc_id: PORT-APPROVAL_CHAIN
title: Port contract — approval_chain
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Port contract — approval_chain

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Direction:** `requires` · **Cardinality:** `zero_or_one`

**Contract.** submit for approval, resolve approvers from role and scope, record decision with reason

**Declared by.** `procurement`, `finance`, `people`, `work_order`

**Behaviour when unbound.** The action executes immediately with an audit note recording that no approval chain was configured.

## Generated provider conformance tests

**PC-01** A provider bound to `approval_chain` satisfies every element of the contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `approval_chain` unbound, every declaring capability behaves exactly as stated under *Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.

**PC-03** Rebinding `approval_chain` from provider A to provider B leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

