---
doc_id: KERNEL-K10
title: Kernel construct K10 — Notification
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K10 — Notification

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A targeted, channel-routed, preference-aware message produced by an Event or Rule.

## Required attributes

- **name**: trigger; **ref**: K08
- **name**: audience_selector; **note**: by role archetype, by relationship (assignee, site supervisor, client contact), never by hardcoded user
- **name**: channels; **values**: ['in_app', 'push', 'email', 'sms', 'whatsapp']
- **name**: template_per_channel
- **name**: priority
- **name**: batching_policy
- **name**: escalation_chain
- **name**: quiet_hours_behaviour
- **name**: cost_class; **note**: free_in_service_window | utility | marketing — see integrations research; this is a real money field

## Invariants

- Audience is always computed from a relationship or role, never stored as a user id, or the notification silently dies when that person leaves.
- Every notification must be suppressible by the recipient EXCEPT those marked mandatory_operational (SLA breach, safety, security alert) or mandatory_legal.

