---
doc_id: PORTC-BILLABLE_OUTCOME_SINK
title: Port contract — billable_outcome_sink
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — billable_outcome_sink

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Also present in the composition seed.

## Providers

### `billing`

**Cardinality:** `exactly_one`

Accept a billable outcome with quantity, rate basis, counterparty, contract reference, description, evidence references and evidence strength, keyed uniquely by source capability and source record. Acknowledge receipt, so a producer can tell whether its revenue arrived.


## Consumers and their declared behaviour when unbound

### `attendance_verification`

**Cardinality:** `zero_or_one`

Accept a settled attendance period as a billable outcome with quantity, rate basis, contract reference and evidence references including the evidence strength.

**When unbound.** Attendance settles normally and records billable_minutes for later use. No billable event is created and the surface shows no billing affordance.

### `backfill_dispatch`

**Cardinality:** `zero_or_one`

Accept a filled backfill as a billable outcome carrying its classification, its premium and the cause of the original loss of cover.

**When unbound.** The classification is still recorded on the request for later use. No billable event is created and the surface shows no billing affordance.

### `booking`

**Cardinality:** `zero_or_one`

Accept a completed booking, a late cancellation charge or a non-attendance charge as a billable outcome with its basis and its disclosure text.

**When unbound.** Bookings complete and their charges are calculated and recorded as outstanding amounts. Nothing is invoiced. Charges are visible as a list so they can be collected elsewhere, rather than being silently dropped.

### `lease_management`

**Cardinality:** `zero_or_one`

Accept a raised charge as a billable outcome with its period, its basis note and its schedule reference.

**When unbound.** Charges are raised and recorded and nothing is invoiced. The schedule exists as a list of what is owed, which is genuinely useful to a small operator billing by hand, and no collection, dispute or arrears machinery exists because that all belongs to billing.


### `order`

**Cardinality:** `zero_or_one`

Accept a fulfilled or closed order as a billable outcome with its lines, adjustments, tax classifications and evidence references.

**When unbound.** Orders total correctly and nothing is invoiced. Totals are visible for collection elsewhere. Payment can still be recorded against the order, so a cash operation works end to end without any billing capability.

### `scheduling_dispatch`

**Cardinality:** `zero_or_one`

Emit a completed assignment as a billable outcome with quantity, rate basis and evidence references.

**When unbound.** Assignments complete normally and record their duration. No billable event is produced and the scheduling surface shows no billing affordance at all, rather than showing one that is disabled.

### `work_order`

**Cardinality:** `zero_or_one`

Accept a completed work order as a billable outcome with quantity, rate basis, contract reference and evidence references.

**When unbound.** The order completes normally and records its outcome. No billable event is created and the UI shows no billing affordance at all rather than showing one disabled.

## Generated provider conformance tests

**PC-01** A provider bound to `billable_outcome_sink` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `billable_outcome_sink` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `billable_outcome_sink` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

