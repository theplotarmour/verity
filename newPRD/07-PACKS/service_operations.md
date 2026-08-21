---
doc_id: PACK-SERVICE_OPERATIONS
title: Pack — service_operations
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Pack — service_operations

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Target businesses.** FM, AMC, maintenance contractors

**Capabilities.** `party`, `sites`, `people`, `scheduling_dispatch`, `work_order`, `helpdesk`, `sla_contract`, `assets`, `evidence_capture`, `billing`, `notification`, `audit`

**Landing workflow.** customer -> ticket -> work order -> technician -> completion with evidence -> SLA measurement -> billing

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
> Location: `pack.service_operations.contents` · Capability: `service_operations`  
> **Blocks:** `capability:party`, `capability:sites`, `capability:people`, `capability:scheduling_dispatch`, `capability:work_order`, `capability:helpdesk`, `capability:sla_contract`, `capability:assets`, `capability:evidence_capture`, `capability:billing`, `capability:notification`, `capability:audit`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
