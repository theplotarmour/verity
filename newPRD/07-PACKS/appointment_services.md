---
doc_id: PACK-APPOINTMENT_SERVICES
title: Pack — appointment_services
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Pack — appointment_services

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Target businesses.** clinics, salons

**Capabilities.** `party`, `catalog`, `scheduling_dispatch`, `booking`, `people`, `billing`, `consumer_surface`, `notification`, `audit`

## Required pack contents

- [ ] capabilities with version ranges
- [ ] resolved port bindings for every requires-port of every included capability
- [ ] role set with full permission expansion
- [ ] navigation tree per role archetype per surface
- [ ] default configuration values
- [ ] default rules and rule overrides
- [ ] default workflows
- [ ] default notification set
- [ ] seeded reference data (units, categories, document types) — never demo customers or fake dashboard widgets
- [ ] default reports, each with its decision question
- [ ] acceptance scenario set that must pass before the pack may be published

> **GAP [blocking] — pack contents are listed as requirements but not yet specified: role set, navigation per role per surface, default configuration, default workflows, seeded reference data, default reports and acceptance scenarios**  
> Location: `pack.appointment_services.contents` · Capability: `appointment_services`  
> **Blocks:** `capability:party`, `capability:catalog`, `capability:scheduling_dispatch`, `capability:booking`, `capability:people`, `capability:billing`, `capability:consumer_surface`, `capability:notification`, `capability:audit`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
