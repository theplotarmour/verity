# Purpose
Contract testing guidelines for ensuring API backward compatibility.

# Scope
REST/RPC endpoints, event schemas, and external integrations.

# Authority
- Authority: EXISTING INFRASTRUCTURE (Vitest 4.1.10)
- Authority: Bible Synthesis, ADOPTED/ADAPTED (Zod for schemas)

# Prerequisites
- Defined Zod schemas representing all contracts.

# Specification Requirements
- WHAT MUST EXIST: Verification that API requests/responses and Event payloads strictly adhere to defined schemas.

# Approved Architecture
- Zod schema validation combined with snapshot testing or explicit structure assertions.

# Implementation Contract
- Write tests that feed valid and invalid JSON payloads to API boundaries.
- Verify backward compatibility by testing older payload versions against new schemas.
- Ensure format validation matches documentation.

# Constraints & Invariants
- External facing APIs must not break existing mobile/offline client contracts.

# Dependencies
- Depends on Zod schema definitions.

# Failure Modes
- Schema drift: Mitigated by generating types directly from Zod.

# Testing Requirements
- Test payload evolution over time.

# Conformance Checks
- CI must fail if an event schema change breaks an existing consumer test.

# Traceability
- MET-ACT-001 (Command boundaries), MET-EVE-001 (Event schemas)

# Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Tooling for explicit Contract Testing (e.g., Pact) or rely on Zod + Vitest.
