# Source of Truth Map

## Purpose
Maps every major platform concept to its single source of truth in the codebase to prevent duplication and drift.

## Scope
In scope: Platform concepts, their designated locations, and underlying authorities.
Out of scope: Transient state or caching.

## Authority
- Bible references and specification documents as listed per concept.

## Prerequisites
- Full repository structure defined.

## Specification Requirements
- WHAT MUST EXIST:
  - Every concept has EXACTLY ONE authoritative definition in code.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED:
  - Strict mapping between concept and directory/file.

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE:

### Platform Concepts
| Concept | Source of Truth | Authority |
|---------|----------------|----------|
| Tenant isolation | `src/server/platform/tenancy/` | INV-001, PLA-TEN-001→006 |
| Identity/Auth | `src/server/platform/identity/` | Spec + EXISTING INFRASTRUCTURE (Supabase) |
| Authorization | `src/server/platform/authorization/` | Bible Synthesis ADOPTED (Keycloak composite roles) |
| Entity definitions | `src/server/capabilities/[cap]/schema.ts` | Spec capability files |
| State machines | `src/server/capabilities/[cap]/states.ts` | Spec capability state definitions |
| Commands | `src/server/capabilities/[cap]/commands/` | MET-ACT-001→004 |
| Events | `src/server/capabilities/[cap]/events.ts` | MET-EVE-001→002 |
| Audit | `src/server/platform/audit/` | EXE-AUD-001→003 |
| Database schema | `prisma/schema.prisma` | Derived from entity definitions |
| UI design system | `src/components/ui/` | Bible V4 + AGENTS.md |
| API contracts | `src/app/api/` | Spec + implementation |
| Configuration | `src/server/platform/config/` | Spec + Bible V5 |
| Custom fields | `src/server/platform/extensions/` | PLA-EXT-001→004 |

### Rationale
- **Why it's the source of truth**: Changes to the concept MUST occur here.
- **What derives from it**: For example, `prisma/schema.prisma` is the source of truth for the DB, but entity models in `schema.ts` dictate business logic validation (Zod schemas).
- **What must stay in sync**: Entity definitions and `schema.prisma`.

### Anti-Patterns
- Having the same concept defined in multiple places (e.g., maintaining state machine transitions in both backend and frontend).
- Duplicating Zod validation schemas across different layers.

## Constraints & Invariants
- Single Source of Truth must always be respected.

## Dependencies
- N/A

## Failure Modes
- Drift between Prisma schema and Zod validation schemas.
- Duplicated business logic in UI components instead of Commands.

## Testing Requirements
- Tests should verify that derivations stay in sync (e.g., schema validation tests).

## Conformance Checks
- Architectural review on PRs.

## Traceability
- Traces to overarching single-source-of-truth principles.

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Tooling for automated sync between `prisma/schema.prisma` and Zod schemas (e.g., `zod-prisma-types`).
