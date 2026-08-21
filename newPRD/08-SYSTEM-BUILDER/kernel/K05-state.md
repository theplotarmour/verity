---
doc_id: KERNEL-K05
title: Kernel construct K05 — State and Transition (Lifecycle)
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K05 — State and Transition (Lifecycle)

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** The finite state machine that governs what may happen to an Entity instance and when.

## Required attributes

- **name**: states; **note**: each with terminal, mutable, billable, visible_to_customer
- **name**: initial_state
- **name**: transitions; **note**: each with from, to, triggering_action, guards, side_effects, reversibility
- **name**: illegal_transition_behaviour; **note**: always E_PRECONDITION, never a silent no-op
- **name**: stuck_state_policy; **note**: for every non-terminal state: how long may an instance sit here before it is an exception, who is told, and what is the escape hatch

## Invariants

- Every non-terminal state must have at least one outbound transition reachable by a role that actually exists in the shipped packs. A state only an administrator can escape is an operational trap.
- Every state machine must declare a stuck_state_policy for every non-terminal state. This is what turns a lifecycle into an operations system rather than a data model.
- Transitions are the only legal way to change state. No action may write the state field directly.

## Generated artifacts

- state_machine_doc
- transition_matrix
- mermaid_diagram
- guard_test_cases
- stuck_state_monitors

