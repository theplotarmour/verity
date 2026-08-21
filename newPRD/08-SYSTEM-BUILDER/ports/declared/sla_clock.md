---
doc_id: PORTC-SLA_CLOCK
title: Port contract — sla_clock
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — sla_clock

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Also present in the composition seed.

## Providers

### `sla_contract`

**Cardinality:** `exactly_one`

Start, pause, resume and stop a clock against a subject, and report the current breach position and remaining time. A pause is accepted only where the reason appears in the service level's pausable_reason_keys, and a rejected pause returns the permitted reasons so the caller can present them.


## Consumers and their declared behaviour when unbound

### `backfill_dispatch`

**Cardinality:** `zero_or_one`

Report the contractual consequence of the commitment going uncovered, so that escalation urgency reflects the penalty rather than only the priority.

**When unbound.** Escalation urgency is driven by priority and lead time alone. The escalation ladder cannot distinguish a commitment whose failure costs nothing from one that triggers a penalty, which means both are chased equally hard - wasteful in one direction and insufficient in the other.

### `helpdesk`

**Cardinality:** `zero_or_one`

Start, pause, resume and stop clocks for first response and resolution against a contract target, and report the breach position.

**When unbound.** Category targets are used as advisory internal goals. Nothing breaches, nothing escalates contractually, and timestamps are recorded throughout so targets can be applied retroactively. The surface shows targets as internal goals rather than as commitments, because presenting an internal goal as a contractual promise is how a helpdesk report becomes evidence against the tenant.


### `work_order`

**Cardinality:** `zero_or_one`

Start, pause, resume and stop a clock against a target derived from a contract, and report the current breach position.

**When unbound.** No clock runs, no breach fires, no escalation. due_at may still be set manually with due_source=manual. Timestamps are recorded throughout, so SLAs can be applied retroactively if the capability is enabled later - which is the composition model's declared behaviour for this port and is restated here because the retroactive path is what makes enabling it later worthwhile.


## Generated provider conformance tests

**PC-01** A provider bound to `sla_clock` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `sla_clock` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `sla_clock` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

