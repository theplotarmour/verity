---
doc_id: KERNEL-K14
title: Kernel construct K14 — View / Surface
generated: true
source_model: _model/_kernel.yaml
regenerate_with: python3 _tools/generate.py
---

# Kernel construct K14 — View / Surface

*Generated. Edit `_model/_kernel.yaml`, not this file.*

**Definition.** A permission-aware projection of entities rendered for a specific role on a specific surface.

## Required attributes

- **name**: surface
- **name**: role_archetypes
- **name**: entities_projected
- **name**: primary_task; **note**: the single job this view exists to complete — mandatory, and if you cannot name one, the view is a dashboard and probably should not exist
- **name**: states_specification; **ref**: vocabulary.ui_states
- **name**: offline_behaviour
- **name**: accessibility_criteria
- **name**: hardware_assumptions; **note**: per product owner: assume cheap Android, gloves, sunlight, shared devices

## Invariants

- A view may not display a field the viewing role cannot read. The projection is computed from K11, not hand-maintained, or the two drift and the UI leaks.
- Every view must specify all eleven UI states. A view without an offline state specification cannot ship to field_mobile, kds or pos.

## Surfaces

- console_desktop
- console_tablet
- field_mobile
- kds
- pos
- client_portal
- consumer_web
- hq_console

