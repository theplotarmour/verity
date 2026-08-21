---
doc_id: PORTC-BACKFILL_REQUEST
title: Port contract — backfill_request
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — backfill_request

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `backfill_dispatch`

**Cardinality:** `zero_or_many`

Accept a signal that a commitment has lost cover, carrying the window, the location, the required qualifications, the required count, the cause and the remaining lead time; run the configured escalation ladder; and report the outcome - filled, partially filled or unfilled - back to the requesting capability.


## Consumers and their declared behaviour when unbound

### `attendance_verification`

**Cardinality:** `zero_or_one`

Signal that a commitment has no attendance claim past its grace period, so cover can be sought.

**When unbound.** The condition is escalated to the supervisor and nothing is dispatched. Every threshold still fires.

### `people`

**Cardinality:** `zero_or_one`

Signal that a member has become unavailable for a period during which they hold commitments, so cover can be sought.

**When unbound.** Assignments in the affected window are flagged to the dispatcher as a list and nothing is dispatched. The list is produced whether or not anyone is watching it, which is weaker than a dispatch but is not silence.

### `scheduling_dispatch`

**Cardinality:** `zero_or_one`

Signal that a covered demand has lost coverage and cover is needed, with the remaining lead time and the priority.

**When unbound.** Coverage loss is reported to the dispatcher as an escalation and nothing is dispatched automatically. Every threshold still fires; only the automatic search is absent.

## Generated provider conformance tests

**PC-01** A provider bound to `backfill_request` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `backfill_request` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `backfill_request` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

