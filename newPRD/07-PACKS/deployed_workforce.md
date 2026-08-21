---
doc_id: PACK-DEPLOYED_WORKFORCE
title: Pack — deployed_workforce
generated: true
source_model: _model/_composition.yaml
regenerate_with: python3 _tools/generate.py
---

# Pack — deployed_workforce

*Generated. Edit `_model/_composition.yaml`, not this file.*

**Target businesses.** security agencies, manpower/staffing

**Capabilities.** `party`, `sites`, `people`, `scheduling_dispatch`, `attendance_verification`, `backfill_dispatch`, `sla_contract`, `billing`, `payroll_input`, `notification`, `audit`

**Landing workflow.** roster -> deployment -> verified attendance -> backfill on absence -> client billing on verified hours -> payroll input

**Note.** Per product owner, backfill billing is a configurable policy, not a hardcoded rule.

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
> Location: `pack.deployed_workforce.contents` · Capability: `deployed_workforce`  
> **Blocks:** `capability:party`, `capability:sites`, `capability:people`, `capability:scheduling_dispatch`, `capability:attendance_verification`, `capability:backfill_dispatch`, `capability:sla_contract`, `capability:billing`, `capability:payroll_input`, `capability:notification`, `capability:audit`  
> The generator has deliberately not supplied a default here. Resolve in the model, then regenerate.
