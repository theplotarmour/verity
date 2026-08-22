# Import Boundaries

## Purpose
Defines concrete import path rules and examples for the Verity codebase.

## Scope
In scope: Concrete code import patterns, path aliases, server/client boundaries.
Out of scope: Logical architectural dependency rules (see `dependency-rules.md`).

## Authority
- tsconfig.json setup: EXISTING INFRASTRUCTURE

## Prerequisites
- `tsconfig.json` with `@/*` mapped to `./src/*`.

## Specification Requirements
- WHAT MUST EXIST:
  - Clean, standardized import paths across the codebase.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED:
  - Use absolute path aliases (`@/`) for all intra-project imports to avoid `../../../` hell.

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE:
### Path Alias
- `@/*` maps to `./src/*` (Authority: EXISTING INFRASTRUCTURE, tsconfig.json)

### Allowed Import Patterns
```typescript
// Platform imports (Layer 0) - always allowed
import { withTenant } from '@/server/platform/tenancy'
import { getCurrentUser } from '@/server/platform/identity'

// Runtime imports (Layer 1) - allowed from Layer 2+
import { defineEntity } from '@/server/runtime/entity'
import { defineCommand } from '@/server/runtime/command'

// Capability public API (Layer 2) - only through declared contracts
import { type Resource } from '@/server/capabilities/resource/contract'

// Shared UI (Layer 4) - allowed from any component
import { Button } from '@/components/ui/button'
```

### Forbidden Import Patterns
```typescript
// NEVER: platform importing capability
import { WorkOrder } from '@/server/capabilities/work' // FORBIDDEN

// NEVER: capability importing another capability's internals
import { resourceService } from '@/server/capabilities/resource/service' // FORBIDDEN

// NEVER: UI importing server internals directly
import { prisma } from '@/lib/prisma' // FORBIDDEN from client components
```

### Server Actions
- Server actions bridge the UI→server boundary in Next.js App Router.
- They must be marked with `"use server"` and live in Layer 3 (Application), delegating to Layer 2 capabilities.

## Constraints & Invariants
- Client components (`"use client"`) must never import node/server modules.

## Dependencies
- Next.js and TypeScript configurations.

## Failure Modes
- Leaking server secrets to the client bundle by importing server files into client components.

## Testing Requirements
- Next.js build step naturally catches client/server boundary violations.

## Conformance Checks
- Custom ESLint plugin or import script to verify boundaries.

## Traceability
- Secures system architecture implementation.

## Open Decisions
- None.
