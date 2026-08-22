# Repository Structure

## Purpose
This document defines the complete directory tree and structural layout for the Verity greenfield rebuild codebase.

## Scope
In scope: Directory hierarchy, file placement rules, application shell layout, and server architecture layout.
Out of scope: Specific code formatting (covered by ESLint/Prettier), database schema contents.

## Authority
- Bible V4: Four Role-Centric Experience Shells (for `app/` structure)
- Next.js App Router convention + platform coherence: IMPLEMENTATION DECISION REQUIRED (for `src/server/` separation)

## Prerequisites
- Clean repository initialized with standard config (`package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`).
- Legacy code moved aside (tagged `veda-legacy-final`).

## Specification Requirements
- WHAT MUST EXIST:
  - Four distinct user experiences: HQ Console, Owner Shell, Worker Shell, B2C Portal.
  - Platform foundation for tenancy and identity.
  - Domain capabilities organized logically.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED:
  - Framework: Next.js 16.2.10 with React 19.2.4 App Router (Authority: EXISTING INFRASTRUCTURE).
  - Data Access: Prisma 6.12.0 (Authority: Bible V1).
  - Structure must clearly separate experience (shells), shared UI, and server logic.

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE:
You must strictly follow this directory structure when creating new files:

```text
src/
  app/                    # Next.js App Router pages
    (hq)/                 # HQ Console shell (Authority: Bible V4)
    (owner)/              # Owner Shell (Authority: Bible V4)
    (worker)/             # Worker Shell (Authority: Bible V4)
    (portal)/             # B2C Portal (Authority: Bible V4)
    api/                  # API routes
  server/                 # Server-side business logic
    platform/             # Platform foundation (tenancy, auth, identity)
    capabilities/         # Domain capabilities (one directory per capability)
    runtime/              # Domain runtime (entity, command, query, state, event)
  lib/                    # Shared utilities
  components/             # Shared UI components
    ui/                   # Design system primitives
  hooks/                  # React hooks
  types/                  # Shared TypeScript types
  test/                   # Test utilities and fixtures
prisma/
  schema.prisma           # Database schema
  migrations/             # Migration files
```

- **`src/app/`**: Contains only the routing and shell layouts. 
- **`src/server/`**: Contains all backend logic. 
- **`src/server/capabilities/[capability-name]/`**: Contains all code for a specific capability (e.g., `work`, `party`). Each capability folder must have a standard internal layout (e.g., `schema.ts`, `service.ts`, `types.ts`).

## Constraints & Invariants
- No UI components or hooks in `src/server/`.
- No database logic or Prisma imports in `src/app/` (except API routes) or `src/components/`. All DB access must go through `src/server/`.

## Dependencies
- Relies on Next.js App Router conventions for the `app/` directory routing.

## Failure Modes
- Putting server actions directly in UI components instead of `src/server/`, leading to spaghetti code.
- Mixing capability logic into platform logic.

## Testing Requirements
- Unit tests must be placed alongside source files (e.g., `service.test.ts` next to `service.ts`).
- Integration tests in `src/test/`.

## Conformance Checks
- Automated directory structure linting.

## Traceability
- Traces to Bible V4 (Shells).

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Should `src/server/runtime/` remain separate from `src/server/platform/` or be merged? (Currently separated per contract).
