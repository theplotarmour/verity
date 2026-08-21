---
doc_id: PACK-PROPERTY_OPERATIONS
title: Pack — property_operations
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Pack — property_operations

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Target businesses.** commercial property management

**Capabilities.** `party`, `sites`, `lease_management`, `billing`, `helpdesk`, `work_order`, `assets`, `notification`, `audit`

**Note.** Per product owner, lease management is a domain capability and explicitly NOT part of Core.

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
> Location: `pack.property_operations.contents` · Capability: `property_operations`  
> **Blocks:** `capability:party`, `capability:sites`, `capability:lease_management`, `capability:billing`, `capability:helpdesk`, `capability:work_order`, `capability:assets`, `capability:notification`, `capability:audit`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
