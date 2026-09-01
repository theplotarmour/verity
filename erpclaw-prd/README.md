# ERPClaw PRD

| | |
|---|---|
| Source | `D:\Code\R&D\erpclaw-main` |
| Target product | Verity interpretation of ERPClaw as an AI-native ERP workspace |
| Source version observed | ERPClaw v4.15.0, `UI.yaml` skill_version 3.2.0 |
| Document status | Product requirements draft derived from source artifacts. It is not an implementation claim for Verity. |
| Created | 2026-09-01 |

## Document Set

- [00 Product Vision](./00-product-vision.md) defines the product, users, principles, trust model, and global non-negotiables.
- [01 Information Architecture And Pages](./01-information-architecture-and-pages.md) specifies every core page/domain from `UI.yaml`, including dashboard, sections, tables, forms, actions, and empty/error states.
- [02 Functional Requirements](./02-functional-requirements.md) expands each ERP domain into detailed user workflows and acceptance requirements.
- [03 Data Actions And Controls](./03-data-actions-and-controls.md) maps entities, commands, safeguards, reports, integrations, permissions, and destructive-action rules.
- [04 Optional Modules And Expansion](./04-optional-modules-and-expansion.md) records module marketplace requirements from the registry and how vertical modules should enter Verity.
- [05 Verity Extraction Plan](./05-verity-extraction-plan.md) identifies which ERPClaw modules, AI architecture patterns, and agent-development skills can be extracted for Verity.

## Source Artifacts Used

- `README.md`: product positioning, installation model, local-first posture, supported ERP coverage, optional web dashboards.
- `SKILL.md`: command catalog, speaking rules, runtime gate, security posture, internal action boundaries.
- `UI.yaml`: dashboard KPIs, quick actions, domains, entity pages, fields, sections, forms, and table-oriented UI metadata.
- `scripts/module_registry.json`: optional vertical module catalog and install/update model.
- `scripts/erpclaw-*`: implementation domains and tests used to validate the functional map.

## Scope

This PRD covers the ERPClaw core foundation as a Verity-grade product surface:

- AI-first business operation through natural language.
- Optional dashboard pages generated from entity/action metadata.
- Accounting, GL, sales, buying, inventory, payments, billing, tax, reports, HR, payroll, advanced accounting, setup/admin, and module management.
- Local-first database operation with SQLite/PostgreSQL compatibility.
- Immutable financial records, auditability, confirmation gates, encrypted secrets, and role-aware access.
- Verity extraction strategy for client-based modules, AI-native architecture, and development skills.

This PRD does not assert that all functionality exists in Verity. It is an input for product design, implementation planning, and conformance checks.
