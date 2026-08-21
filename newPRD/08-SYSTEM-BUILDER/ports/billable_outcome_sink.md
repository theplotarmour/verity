---
doc_id: PORT-BILLABLE_OUTCOME_SINK
title: Port contract — billable_outcome_sink
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Port contract — billable_outcome_sink

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Direction:** `requires` · **Cardinality:** `zero_or_one`

**Contract.** accepts a billable event with quantity, rate basis, contract reference, and evidence references

**Declared by.** `work_order`, `attendance_verification`, `booking`, `service_completion`

**Behaviour when unbound.** The producing action completes normally and records the outcome. No billable event is created. The UI does not show billing affordances at all rather than showing them disabled.

**Typical providers.** `contract_billing`, `attendance_based_billing`, `order_billing`, `none`

## Generated provider conformance tests

**PC-01** A provider bound to `billable_outcome_sink` satisfies every element of the contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `billable_outcome_sink` unbound, every declaring capability behaves exactly as stated under *Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.

**PC-03** Rebinding `billable_outcome_sink` from provider A to provider B leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

