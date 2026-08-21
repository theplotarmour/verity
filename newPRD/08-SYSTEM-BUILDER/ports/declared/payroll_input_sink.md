---
doc_id: PORTC-PAYROLL_INPUT_SINK
title: Port contract — payroll_input_sink
generated: true
source_model: capability models
regenerate_with: python3 _tools/generate.py
---

# Port contract — payroll_input_sink

*Generated. Edit `capability models`, not this file.*

Declared by capability models. Not in the composition seed; this port exists because capabilities declare it.

## Providers

> **GAP [modelling] — no capability in the library declares that it provides this port; it is either satisfied by a system outside Verity, or its provider has not been modelled. See _composition.yaml external_provider_ports and ports_awaiting_a_capability.**  
> Location: `port.payroll_input_sink.provider` · Capability: `payroll_input_sink`  
> **Blocks:** `capability:attendance_verification`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.

## Consumers and their declared behaviour when unbound

### `attendance_verification`

**Cardinality:** `zero_or_one`

Accept a settled attendance period as a payroll input with payable minutes, the pay period, and any adjustment history.

**When unbound.** Attendance settles and records payable_minutes. Nothing is exported, and the export becomes a manual report. Deliberately not an error - a great many target businesses run payroll outside any software.

## Generated provider conformance tests

**PC-01** A provider bound to `payroll_input_sink` satisfies every element of every contract above; a provider missing any element fails install-time validation rather than failing at runtime.

**PC-02** With `payroll_input_sink` unbound, every consumer above behaves exactly as its own *When unbound* statement says, with no orphaned UI affordance and no error surfaced to the user. Consumers declaring FORBIDDEN are hard dependencies and the pack that leaves them unbound cannot be published.

**PC-03** Rebinding `payroll_input_sink` from one provider to another leaves in-flight records valid or migrates them explicitly; silent orphaning fails the test.

