# Module Boundaries

## Purpose
Defines which code belongs where, import direction rules, and dependency layers for the Verity platform.

## Scope
In scope: Layer architecture, import direction rules, capability boundaries.
Out of scope: File naming conventions (see `naming-conventions.md`).

## Authority
- Layer isolation principles: IMPLEMENTATION DECISION REQUIRED (Adapted from Clean Architecture).

## Prerequisites
- Repository structure established (see `repository-structure.md`).

## Specification Requirements
- WHAT MUST EXIST:
  - Strong separation of concerns between platform primitives, domain logic, and presentation.
  - Strict boundaries between capabilities to avoid tight coupling.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED:
  - The system is divided into strict hierarchical layers.

### Layer Diagram
```text
Layer 0: Platform Foundation (tenancy, identity, auth, config)
Layer 1: Domain Runtime (entity, command, query, state, event, rule, audit)
Layer 2: Capabilities (party, user, role, work, location, resource, etc.)
Layer 3: Application (API routes, server actions, UI pages)
Layer 4: Experience (shells, components, hooks)
```

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE:
- **Higher layers may import from lower layers.**
- **Lower layers MUST NOT import from higher layers.**
- **Layer 0** is self-contained (no upward imports).
- **Layer 1** may import from Layer 0 only.
- **Layer 2** may import from Layer 0 and Layer 1.
  - **No undeclared direct imports between Layer 2 capabilities.** Capabilities CAN depend on each other through declared contracts, platform services, domain events, or composition.
- **Layer 3** may import from any lower layer.
- **Layer 4** may import from Layer 3 (through server actions) and shared components.

Cross-cutting concerns (logging, metrics, core utilities) must live in Layer 0.
To declare a capability dependency, capabilities must export explicit typed contracts or interfaces in a designated file (e.g. `contract.ts`).

## Constraints & Invariants
- Capability Dependency Rule: No undeclared direct dependency between capabilities.
- UI code cannot import server capabilities directly except through server actions or API layer abstractions.

## Dependencies
- Relies on Next.js for Layer 3/4 separation mechanisms.

## Failure Modes
- Accidental circular dependencies.
- Capability A imports Capability B's internal database service directly, leading to tight coupling.

## Testing Requirements
- Architecture tests (e.g., using `eslint-plugin-boundaries` or similar tools) to enforce layer directions.

## Conformance Checks
- Static analysis during build process.

## Traceability
- Architectural integrity rule.

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Formal mechanism for declaring contracts between capabilities (e.g., strictly `index.ts` vs `contract.ts`).
