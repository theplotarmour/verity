# Naming Conventions

## Purpose
Establishes the definitive rules for naming files, functions, types, database entities, and other code elements in Verity.

## Scope
In scope: File naming, type/interface naming, function naming, database naming, enum naming.
Out of scope: Structural placement of files.

## Authority
- Canonical Glossary: GOV-TER-001→017
- TypeScript/Next.js Conventions: EXISTING INFRASTRUCTURE

## Prerequisites
- Standard ESLint and Prettier configuration.

## Specification Requirements
- WHAT MUST EXIST:
  - Code artifacts must strictly map to the Canonical Glossary.
  - Prohibited synonyms must never appear in the codebase.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED:
  - Strict adherence to case conventions based on artifact type.

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE:
### File Naming
- Use `kebab-case` for files: `work-order.ts`, `party-service.ts`
- Use `PascalCase` for React components: `WorkOrderCard.tsx`
- Use `kebab-case` for directories: `field-service/`, `work-order/`
- Test files: `*.test.ts` alongside source files

### Type/Interface Naming
- `PascalCase`: `WorkOrder`, `Party`, `Resource`, `Location`
- MUST match GOV-TER canonical terms exactly.
- **Prohibited:** any synonym from the glossary's prohibited list (no `job_card`, `task` for work, `client_obj`, `branch`, `employee_row`).

### Function Naming
- `camelCase`: `createWorkOrder`, `assignResource`, `checkInWorker`
- Commands: verb + noun (`createParty`, `updateLocation`, `transitionWorkOrder`)
- Queries: get/find/list + noun (`getWorkOrder`, `findParties`, `listResources`)

### Database Naming
- `snake_case` for tables and columns: `work_order`, `tenant_id`, `created_at`
- Tables named after canonical entities (not plural): `work_order`, `party`, `resource`
- Foreign keys: `referenced_entity_id` (e.g., `tenant_id`, `party_id`, `location_id`)
- **NEVER use VEDA legacy names** (`factory_id`, `department`, `job_card`, `SalesOrder` automotive columns).

### Enum Naming
- `PascalCase` for enum types: `WorkOrderStatus`, `PartyState`
- `SCREAMING_SNAKE_CASE` for values: `DRAFT`, `IN_PROGRESS`, `COMPLETED`
- MUST match spec state definitions.

### Requirement ID Format
- `(GOV|PLA|MET|EXE|REQ)-[CAP]-[FILE]-[ID]`

## Constraints & Invariants
- The Canonical Glossary is the supreme law for naming business concepts.

## Dependencies
- Applies across all system layers.

## Failure Modes
- Reintroducing legacy terms through copying old database schemas or API payloads.

## Testing Requirements
- Code reviews must reject PRs using prohibited synonyms.

## Conformance Checks
- Custom ESLint rules checking against the prohibited glossary list.

## Traceability
- Traces to GOV-TER-001→017.

## Open Decisions
- **DEC-BIBLE-006**: Checklist Item Naming (ChecklistItem vs Task naming conflict).
