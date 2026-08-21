---
doc_id: PACK-FOOD_SERVICE
title: Pack — food_service
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Pack — food_service

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Target businesses.** restaurants, cloud kitchens

**Capabilities.** `party`, `catalog`, `order`, `kitchen_flow`, `inventory`, `procurement`, `billing`, `consumer_surface`, `offline_sync`, `audit`

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
> Location: `pack.food_service.contents` · Capability: `food_service`  
> **Blocks:** `capability:party`, `capability:catalog`, `capability:order`, `capability:kitchen_flow`, `capability:inventory`, `capability:procurement`, `capability:billing`, `capability:consumer_surface`, `capability:offline_sync`, `capability:audit`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
