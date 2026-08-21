---
doc_id: KERNEL-K09
title: Kernel construct K09 — Workflow
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K09 — Workflow

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A named, resumable, multi-step orchestration that spans actions across one or more capabilities.

## Distinguished from

A Lifecycle (K05) is intra-entity. A Workflow is inter-entity and often inter-capability. Ticket -> Work Order -> Technician -> Asset -> Inventory -> Completion -> Billing is a Workflow, not a lifecycle.


## Required attributes

- **name**: trigger; **values**: ['event', 'schedule', 'manual', 'external_webhook', 'rule_constraint_breach']
- **name**: steps; **note**: each step names a capability Port, an action, its actor, its timeout and its compensating action
- **name**: compensation; **note**: what unwinds when a later step fails after an earlier step committed
- **name**: timeout_policy
- **name**: escalation_policy
- **name**: idempotency
- **name**: partial_completion_semantics
- **name**: human_in_the_loop_steps

## Invariants

- Every step that commits an irreversible external effect (payment captured, WhatsApp sent, invoice IRN generated) must be marked non_compensable, and the workflow must be designed so all non_compensable steps occur after every step that can fail cheaply.
- A workflow must declare what an operator sees when it is stuck. Invisible stuck workflows are how operations teams lose trust in a system.

