# Purpose
Records how implementation decisions are tracked back to original authorities.

# Scope
Architecture decisions, technology choices, escalations.

# Authority
- Authority: Bible V1-5

# Prerequisites
- ADR (Architecture Decision Record) process.

# Specification Requirements
- WHAT MUST EXIST: Log of all technical decisions citing authority.

# Approved Architecture
- Markdown decision log.

# Implementation Contract
- Every implementation decision MUST cite Bible/Spec authority.
- **Decision format:**
  - Decision
  - Authority (e.g., "Authority: Bible V1, [section]", "Authority: Spec [REQ-ID]", "Authority: EXISTING INFRASTRUCTURE")
  - Alternatives Considered
  - Rationale
- Escalation path: If no authority exists, tag with `IMPLEMENTATION DECISION REQUIRED` and escalate to product owner/architect.

# Constraints & Invariants
- No invention without authority.

# Dependencies
- None.

# Failure Modes
- Undocumented "clever" solutions.

# Testing Requirements
- N/A

# Conformance Checks
- Code review verification of decision records.

# Traceability
- N/A

# Open Decisions
- None.
