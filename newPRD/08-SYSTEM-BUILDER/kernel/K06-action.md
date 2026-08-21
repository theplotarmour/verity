---
doc_id: KERNEL-K06
title: Kernel construct K06 — Action
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K06 — Action

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A named, permissioned, auditable operation that a principal or the system may invoke against an Entity.

## Required attributes

- **name**: verb; **ref**: vocabulary.verbs
- **name**: actors
- **name**: preconditions
- **name**: inputs
- **name**: effects; **note**: creates, updates, transitions
- **name**: events_emitted; **ref**: K08
- **name**: notifications; **ref**: K10
- **name**: reversibility
- **name**: concurrency_rule
- **name**: idempotency_key_source
- **name**: audit_class
- **name**: failure_modes
- **name**: edge_cases
- **name**: offline_policy; **values**: ['queue', 'refuse', 'read_only']
- **name**: rate_limit

## Invariants

- An action with reversibility=false must have a confirmation specification. Irreversible-and-unconfirmed is a generator error.
- Every mutating action must declare an idempotency_key_source, because at-least-once delivery and offline replay both re-send.
- No action may be defined without at least one enumerated failure mode. An action that "cannot fail" has not been thought about.

