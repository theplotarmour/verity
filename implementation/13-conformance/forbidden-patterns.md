# Purpose
Registers all forbidden legacy patterns (VEDA) and anti-patterns to prevent contamination.

# Scope
Codebase parsing, code review guidelines, CI checks.

# Authority
- Authority: Bible V1-5 (Clean Architecture, No Legacy Contamination)
- Authority: Spec GOV-TER-001→017 (Terminology)

# Prerequisites
- Codebase initialized.

# Specification Requirements
- WHAT MUST EXIST: Zero presence of legacy VEDA constructs.

# Approved Architecture
- Grep/ripgrep based CI assertions.

# Implementation Contract
- **FORBIDDEN PATTERNS:**
  - `factoryId` / `factory_id` (Use Organization/Tenant ID)
  - `Department` as production stage (Use generalized states/locations)
  - `SalesOrder` automotive columns (`vehicleBrandId`, `vehicleModelId`, `vehicleYear`, `seatType`, `hasArmrest`, `headrestCount`)
  - `ItemType` enum specifics (`RAW_MATERIAL`, `SEMI_FINISHED`, `FINISHED_PRODUCT`, `CONSUMABLE`, `PACKAGING`, `SPARE_PART`, `MACHINERY`, `TOOL`, `ASSET`, `SERVICE`)
  - `SpecRefTarget` enum (`VEHICLE_BRAND`, `VEHICLE_MODEL`, `VEHICLE_GENERATION`, `DESIGN`, `COLOR`)
  - `SystemRole` enum (`OWNER`, `CO_OWNER`, `MANAGER`, `SUPERVISOR`, `WORKER`, `STORE_MANAGER`)
  - `ProductionBatch`, `BomMode`, `QCTemplate`
  - `.verity-glass` or Glassmorphism as default UI.
  - Routes: `/owner`, `/worker`, `/inspector`, `/supervisor`, `/verity`
  - `@@map` to VEDA schema names
- **ANTI-PATTERNS:** Direct DB mutation bypassing command layer, cross-tenant FKs, mutable audit records, state transitions without events, undeclared capability imports, hardcoded dark color classes, client-supplied tenant_id expanding visibility.

# Constraints & Invariants
- See AUTOMATED CHECK SCRIPT below.

# Dependencies
- Depends on `ripgrep` available in CI.

# Failure Modes
- Legacy terms slipping into schema migrations.

# Testing Requirements
- **AUTOMATED CHECK SCRIPT:**
  ```bash
  rg 'factoryId|factory_id' src/
  rg 'OWNER|CO_OWNER|STORE_MANAGER' src/ --glob '!*.test.ts'
  rg 'vehicleBrand|vehicleModel|seatType' src/
  rg 'ProductionBatch|BomMode|QCTemplate' src/
  rg 'verity-glass' src/
  rg 'text-slate-9[0-9][0-9]' src/
  ```

# Conformance Checks
- Run script on every PR.

# Traceability
- GOV-TER-001→017

# Open Decisions
- None.
