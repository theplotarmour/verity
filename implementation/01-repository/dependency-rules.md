# Dependency Rules

## Purpose
Defines what can import what, prohibiting circular dependencies, and enforcing layer isolation and capability independence.

## Scope
In scope: Import prohibitions, declared dependency mechanisms, enforcement strategies.
Out of scope: General import syntax (TypeScript standards).

## Authority
- Clean Architecture principles: IMPLEMENTATION DECISION REQUIRED.

## Prerequisites
- Module boundaries defined (Layer 0 to 4).

## Specification Requirements
- WHAT MUST EXIST:
  - Safe, decoupled modules that can be tested and modified independently.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED:
  - Capabilities must remain isolated. If Capability A needs Capability B, it must do so explicitly via established contracts.

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE:
### Hard Rules
- **No circular dependencies** (enforced at build time).
- **No layer violation imports** (lower cannot import higher).
- **No undeclared cross-capability imports**.
- Platform code NEVER imports capability code.
- Capability code NEVER directly imports another capability's internal modules.

### Declared Dependency Mechanisms
Capabilities CAN depend through:
- **Platform services**: Capabilities depend on platform through well-defined interfaces.
- **Domain events**: Capabilities react to events from other capabilities through the event bus.
- **Composition**: Capabilities compose at the application layer (Layer 3), not internally.
- **Declared contracts**: Capabilities may expose typed interfaces that other capabilities import.

### Dependency Declaration Format
- A capability must expose a `contract.ts` or `public.ts` file that exports types, interfaces, or highly controlled service abstractions. 
- Other capabilities may import ONLY from this contract file.

### Enforcement
- TypeScript path aliases.
- ESLint rules (`eslint-plugin-import` and boundary tools).

### Examples
- `Work` depends on `Resource` (through declared contract for assignment).
- Scheduling depends on `Resource` (through declared contract for availability).
- These are DECLARED dependencies, not undeclared direct imports.

## Constraints & Invariants
- Zero capability inter-dependencies on internal implementation files.

## Dependencies
- ESLint configuration.

## Failure Modes
- Tangled logic where changing a `Party` breaks a `WorkOrder` in unexpected ways due to deep internal function imports.

## Testing Requirements
- Build-time circular dependency detection.

## Conformance Checks
- Strict CI/CD linting.

## Traceability
- Architectural independence.

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Event bus mechanism (e.g., Inngest vs internal memory bus).
