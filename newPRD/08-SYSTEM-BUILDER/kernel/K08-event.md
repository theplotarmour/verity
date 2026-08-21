---
doc_id: KERNEL-K08
title: Kernel construct K08 — Event
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K08 — Event

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** An immutable record that something happened, published for consumption by other capabilities and by automations.

## Required attributes

- **name**: envelope; **ref**: vocabulary.event_convention
- **name**: payload_schema
- **name**: payload_version
- **name**: emitted_by_actions
- **name**: subscribers_permitted; **note**: which capabilities may subscribe, and whether the payload is redacted per subscriber

## Invariants

- Events are the ONLY permitted cross-capability runtime coupling other than declared Ports. A capability may not call another capability's action directly.
- Event payloads are permission-blind. Redaction happens at delivery, per subscriber. A capability must never receive a field it could not have read via the API.

