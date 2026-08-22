# Purpose
Defines the business rule engine for validation and computation logic during command execution.

# Scope
Covers validation rules, computation rules, rule registration, and execution ordering.

# Authority
- PRN-001: Least Surprise / Explainable Automation
- Spec MET-ACT-003: Precondition Verification

# Prerequisites
- Command Pipeline (`command.md`)

# Specification Requirements
- Validation rules must be evaluated during Precondition Verification (MET-ACT-003).

# Approved Architecture
- **Rule Engine**: Declarative function registries evaluated within the command pipeline.

# Implementation Contract
- **Validation Rules**: Boolean functions evaluating system state. Executed during MET-ACT-003. Failure throws `ValidationError` and rolls back.
- **Computation Rules**: Derive field values (e.g., calculate SLA deadline from contract terms). Executed during the mutation phase.
- **Rule Registration**: Capabilities explicitly declare rules associated with entities/actions.
- **Execution Order**: Validation BEFORE Mutation. Computation DURING Mutation.
- **Explainability (PRN-001)**: Rules MUST NOT use hidden magic. They must be explicit, traceable, and their outcomes logged or communicated clearly to the user.

# Constraints & Invariants
- Rule failures MUST prevent transaction commit.

# Dependencies
- Depends on: Command Pipeline

# Failure Modes
- Rule evaluation throws error -> transaction aborts.

# Testing Requirements
- Unit test all rules independently.
- Integration test rule execution inside commands.

# Conformance Checks
- Code review to ensure rules are declarative and explainable.

# Traceability
- PRN-001, MET-ACT-003

# Open Decisions
- None
