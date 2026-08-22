# No Legacy Policy

## Purpose
Establishes absolute guardrails against the contamination of the Verity rebuild by legacy VEDA concepts, code, patterns, or schemas.

## Scope
Applies to all source code, database schemas, UI designs, APIs, terminology, and test suites in the Verity repository.

## Authority
Authority: Bible V1

## Prerequisites
None

## Specification Requirements
- The active Verity repository is a strict greenfield implementation.
- Absolute prohibition of specific legacy VEDA patterns.

## Approved Architecture
- **Git Tag Strategy**: Git tag `veda-legacy-final` (commit `065e510`) preserves the last VEDA state. This tag is historical and non-authoritative.
- **Archive Policy**: No `legacy_archive/` directory is permitted in the active tree. Legacy code may only be consulted for forensics, never for architecture or implementation copying.

## Implementation Contract

### Zero Contamination Rule
No legacy VEDA application code, schema, UI, domain model, route, workflow, seed, test, compatibility layer, or archived source is part of the implementation context.

### FORBIDDEN PATTERNS
The following are concrete, grep-able strings that MUST NEVER appear in new code:

1. **`factoryId` / `factory_id`**
   - *Why*: Legacy VEDA isolated by factories. Verity is a multi-tenant platform.
   - *What to use instead*: `tenantId` / `organizationId` (Authority: PLA-TEN-001)

2. **`Department` as a production stage**
   - *Why*: (e.g., CAD→Cutting→Stitching→QC→Packing). This is hardcoded legacy workflow.
   - *What to use instead*: Dynamic State Machines or `Work` stages.

3. **SalesOrder automotive columns**
   - *Forbidden*: `vehicleBrandId`, `vehicleModelId`, `vehicleYear`, `seatType`, `hasArmrest`, `headrestCount`
   - *Why*: Represents extreme domain leakage into core platform models.
   - *What to use instead*: Custom Fields (Authority: PLA-EXT-001)

4. **`ItemType` enum values**
   - *Forbidden*: `RAW_MATERIAL`, `SEMI_FINISHED`, `FINISHED_PRODUCT`, `CONSUMABLE`, `PACKAGING`, `SPARE_PART`, `MACHINERY`, `TOOL`, `ASSET` (as enum values)
   - *Why*: Hardcoded domain specifics.
   - *What to use instead*: Extensible taxonomies / Categories.

5. **`SpecRefTarget` enum**
   - *Forbidden*: `VEHICLE_BRAND`, `VEHICLE_MODEL`, `VEHICLE_GENERATION`, `DESIGN`, `COLOR`
   - *Why*: Automotive domain leakage.

6. **`SystemRole` enum**
   - *Forbidden*: `OWNER`, `CO_OWNER`, `MANAGER`, `SUPERVISOR`, `WORKER`, `STORE_MANAGER`
   - *Why*: Rigid role definitions.
   - *What to use instead*: Dynamic Permissions (Verb+Entity+Scope).

7. **Legacy Domain Entities**
   - *Forbidden*: `ProductionBatch`, `BomMode`, `QCTemplate`

8. **UI Identity**
   - *Forbidden*: `.verity-glass` / glassmorphism as default UI identity.
   - *Why*: Explicitly banned in Bible V4.

9. **Legacy Routes**
   - *Forbidden*: `/owner`, `/worker`, `/inspector`, `/supervisor`, `/verity`
   - *Why*: Legacy VEDA role-based routing.

10. **Schema Name Mapping**
    - *Forbidden*: Schema names mapped via `@@map` to VEDA naming conventions.

## Constraints & Invariants
- Any PR introducing forbidden patterns must be immediately rejected.

## Dependencies
None

## Failure Modes
- Reintroducing domain-specific hardcoded columns (like `vehicleYear`) breaks platform agnosticism.
- Using `factoryId` breaks the generalized tenancy model `organizationId`.

## Testing Requirements
- Automated CI pipeline must grep for all forbidden patterns and fail the build if any are found.

## Conformance Checks
Pre-commit hooks enforcing the absence of forbidden strings.

## Traceability
Bible V1, Bible V4, PLA-TEN-001, PLA-EXT-001

## Open Decisions
None
