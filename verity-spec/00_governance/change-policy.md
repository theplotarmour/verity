# Verity Master Platform Specification

## 00_governance/change-policy.md

## Provenance
*   **Primary Sources**: None
*   **Verity Bible Authority**: [verity-bible/volume_1_constitution_philosophy.md](file:///D:/Code/verity/verity-bible/volume_1_constitution_philosophy.md) (Section 1: Absolute Constitutional Charter - Codebase Subordination)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Change Control Policy

The Verity Master Platform Specification (`verity-spec/`) is a version-controlled, immutable engineering contract. Modifying this specification requires strict compliance with change rules to prevent architectural drift.

---

## 2. Specification Mutation Rules

### GOV-CHA-001: Commit Integrity
Any change to a file inside the specification directory (`verity-spec/`) must be committed with a git message referencing:
1.  The unique ADR ID authorizing the change (e.g. `docs(spec): update work order states per ADR-042`).
2.  Or a direct Level 1 Constitutional Decision ID (e.g. `docs(spec): override RLS rule per user directive`).
*   **Status**: `[UNKNOWN]`

### GOV-CHA-002: Validation Hooks
The repository enforces pre-commit git hooks that validate formatting and links. Any commit containing broken relative paths or markdown syntax errors inside `verity-spec/` will be rejected.
*   **Status**: `[UNKNOWN]`

### GOV-CHA-003: Version Tagging
The specification corpus is versioned independently of the implementation codebase using Semantic Versioning (e.g. `Spec Version 1.4.0` representing a change in optional capabilities).
*   *Major Version*: Added, changed, or deleted a core platform primitive, tenancy rule, or constitutional constraint.
*   *Minor Version*: Added or changed a reusable Capability definition or Industry Pack layout.
*   *Patch Version*: Fixed a typo, clarified wording, or updated external traceability references.
*   **Status**: `[UNKNOWN]`

---

## 3. Propagation of Changes

### GOV-CHA-004: Implementation Re-Sync
When a Major or Minor version update of the specification is committed, the engineering team must run the `Platform Coherence Auditor` to identify implementation files that have drifted from the spec. Drifted code must be flagged as deprecated and refactored immediately.
*   **Status**: `[UNKNOWN]`
