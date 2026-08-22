# Purpose
Defines the command execution pipeline for all write operations in Verity.

# Scope
Covers schema validation, authorization, precondition verification, mutation, event emission, idempotent submission, and optimistic concurrency.

# Authority
- Spec MET-ACT-001→004: Command pipeline requirements
- Bible Synthesis ADAPTED: Zod schema validation
- Bible V3: Optimistic concurrency via version tokens
- Bible V3: Idempotent submission tokens

# Prerequisites
- PostgreSQL & Prisma
- Event Bus implementation

# Specification Requirements
- MET-ACT-001: Schema Validation (input validated against static schema before mutation).
- MET-ACT-002: Authorization Enforcement (abort with E_FORBIDDEN).
- MET-ACT-003: Precondition Verification (business invariants verified, rolls back on failure).
- MET-ACT-004: Event Emission on Commit (emit on successful commit, never if rolled back).

# Approved Architecture
- **Validation**: Zod 4.4.3 (Authority: Bible Synthesis ADAPTED)
- **Concurrency**: Version token check (Authority: Bible V3)
- **Idempotency**: Client-supplied `commandId` (Authority: Bible V3)

# Implementation Contract
All commands MUST execute through this strict pipeline:
1. **Schema Validation (MET-ACT-001)**: Validate `input` against Zod schema.
2. **Authorization (MET-ACT-002)**: Check `actor` permissions against action.
3. **Precondition Verification (MET-ACT-003)**: Check business rules (e.g., entity state allows mutation).
4. **Mutation**: Apply changes inside a DB transaction. Check `version` token; throw `E_CONFLICT` on mismatch. Handle `commandId` for idempotency.
5. **Event Emission (MET-ACT-004)**: Write event to Outbox within the same transaction.

Code Pattern:
```typescript
function defineCommand<TInput, TOutput>(config: {
  schema: z.ZodSchema<TInput>,
  authorize: (actor, input) => boolean,
  verify: (input, ctx) => Promise<void>,
  mutate: (input, ctx, tx) => Promise<TOutput>,
  emit: (output, ctx) => EventPayload
}) {
  // Implementation of the pipeline
}
```

# Constraints & Invariants
- Commands MUST NOT emit events if the transaction rolls back.
- Commands MUST reject mismatched versions with `E_CONFLICT`.

# Dependencies
- Depends on: Zod, Prisma transactions, Event Outbox.

# Failure Modes
- Validation fails -> `ValidationError`.
- Auth fails -> `E_FORBIDDEN`.
- Precondition fails -> `ValidationError` (rollback).
- Version mismatch -> `E_CONFLICT` (rollback).

# Testing Requirements
- Test each stage of the pipeline independently and integrated.
- Verify rollback prevents event emission.

# Conformance Checks
- Static analysis to ensure DB writes happen only within the command pipeline wrapper.

# Traceability
- MET-ACT-001, MET-ACT-002, MET-ACT-003, MET-ACT-004

# Open Decisions
- None
