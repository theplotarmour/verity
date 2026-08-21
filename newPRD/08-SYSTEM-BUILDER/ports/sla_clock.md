---
doc_id: PORT-SLA_CLOCK
title: Port contract — sla_clock
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Port contract — sla_clock

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Direction:** `requires` · **Cardinality:** `zero_or_one`

**Contract.** start, pause, resume, breach-check and escalate against a target derived from a contract

**Declared by.** `helpdesk`, `work_order`, `booking`

**Behaviour when unbound.** No clock runs, no breach fires, no escalation. Timestamps are still recorded so SLAs can be applied retroactively if the capability is enabled later.

## Generated provider conformance tests

**PC-01** A provider bound to `sla_clock` satisfies every element of the contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `sla_clock` unbound, every declaring capability behaves exactly as stated under *Behaviour when unbound*, with no orphaned UI affordance and no error surfaced to the user.

**PC-03** Rebinding `sla_clock` from provider A to provider B leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

