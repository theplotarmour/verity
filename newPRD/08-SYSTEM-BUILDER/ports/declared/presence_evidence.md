---
doc_id: PORTC-PRESENCE_EVIDENCE
title: Port contract — presence_evidence
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — presence_evidence

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

### `sites`

**Cardinality:** `zero_or_one`

Given a location, a position and a reported accuracy, return inside, outside or inconclusive, together with the geofence version used and the margin by which the verdict was reached. The margin is part of the contract because a verdict of outside by three metres and a verdict of outside by four kilometres are different facts and a consumer that cannot tell them apart will treat them identically.


## Consumers and their declared behaviour when unbound

### `attendance_verification`

**Cardinality:** `zero_or_one`

Given a location, a position and a reported accuracy, return inside, outside or inconclusive with the geofence version and the margin.

**When unbound.** position verdicts remain not_evaluated and evidence strength cannot exceed self_declared or supervisor_attested. Attendance still works and is materially weaker, and every record says so through its strength field rather than looking identical to a verified one.


### `evidence_capture`

**Cardinality:** `zero_or_one`

Given a location, a position and a reported accuracy, return inside, outside or inconclusive with the geofence version and the margin.

**When unbound.** position items are stored with their coordinates and accuracy and position_verdict stays not_evaluated. Every requirement demanding a position is satisfiable by capturing one and no verdict is produced, so a consumer wanting a verdict receives not_evaluated rather than a guess.


### `kitchen_flow`

**Cardinality:** `zero_or_one`

Confirm that the device recording a step is at the location it claims to be.

**When unbound.** Steps are recorded with the device reference and no position verdict. A fixed station display is not going anywhere, so this port matters only where preparation happens on handheld devices, and its absence is recorded on each step rather than assumed away.

## Generated provider conformance tests

**PC-01** A provider bound to `presence_evidence` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `presence_evidence` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `presence_evidence` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

