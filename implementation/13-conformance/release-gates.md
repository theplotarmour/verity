# Purpose
Defines the gates and criteria required to release a milestone or phase of the Verity platform.

# Scope
Automated checks, milestone gates, escalations, traceability, performance, and security.

# Authority
- Authority: Bible V1-5

# Prerequisites
- CI/CD pipelines operational. Test suites written.

# Specification Requirements
- WHAT MUST EXIST: A formal pre-release checklist to prevent regressions or non-conformant code from reaching production.

# Approved Architecture
- N/A (Process document)

# Implementation Contract
- **Pre-release conformance checklist:**
  - All automated checks (tests, lint, typecheck, forbidden patterns) must pass.
  - All milestone gates for the current phase must pass.
  - No P0 or P1 escalations outstanding.
  - Traceability matrix complete for implemented capabilities.
  - Performance baselines established.
  - Security review (RLS verification, Authorization tests) complete.

# Constraints & Invariants
- Releases cannot bypass security or RLS verification gates.

# Dependencies
- Depends on all testing and conformance tools.

# Failure Modes
- Rushed releases bypassing gates. Mitigated by hard CI branch protection.

# Testing Requirements
- N/A

# Conformance Checks
- Manual sign-off required alongside automated CI passes.

# Traceability
- N/A

# Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Specific performance baseline metrics (e.g., p95 API response times).
