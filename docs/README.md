# Verity Documentation Authority

`docs/` is the only canonical source of truth for Verity product, architecture, workflow, data, design, API, security, deployment, and roadmap decisions.

## Canon Rules

- If a feature is not documented here, it is not ready to be implemented.
- If code and docs disagree, the docs define the intended system and the code must be brought back into alignment.
- Research material is input, not authority. Canonical decisions must graduate into architecture, engine, workflow, data model, or ADR documents.
- Verity is described as a production-grade configurable Factory Operating System. Do not describe it as an MVP.

## Reading Order

1. `00_Vision/01_Verity_Vision.md`
2. `01_Product/01_Product_Bible.md`
3. `14_DECISIONS/0001-why-verity-docs-are-canonical.md`
4. `03_Architecture/01_Architecture_Overview.md`
5. `04_Business_Engines/`
6. `06_Modular_Workflows/`
7. `08_Data_Model/`
8. `09_Design_System/`
9. `10_API/`
10. `11_Security/`
11. `12_Deployment/`
12. `13_Roadmap/`

## Folder Map

- `00_Vision`: mission, philosophy, principles, non-goals
- `01_Product`: product strategy, operating thesis, market, value capture
- `02_Research`: research inputs and inspiration map
- `03_Architecture`: platform structure and technical strategy
- `04_Business_Engines`: one canonical document per major business engine
- `05_Factory_Builder`: owner-configurable systems
- `06_Modular_Workflows`: operational lifecycle and cross-engine workflows
- `07_User_Experiences`: role-based operating journeys
- `08_Data_Model`: domain entities and schema authority
- `09_Design_System`: actual interface language and interaction rules
- `10_API`: module API contracts and integration boundaries
- `11_Security`: auth, authorization, audit, secrets, recovery, and offline safeguards
- `12_Deployment`: production infrastructure and operational runbook
- `13_Roadmap`: maturity phases
- `14_DECISIONS`: architecture decision records
