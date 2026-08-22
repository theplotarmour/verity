# Claude Operating Manual

## Purpose
This document provides complete operating instructions for Claude Code sessions implementing Verity. It outlines the mission, first-session bootstrap, per-session startup, task execution, and end-of-session handoff.

## Scope
In scope: Bootstrapping a session, task execution loops, quality gates, and session continuity for Claude working on Verity.
Out of scope: Domain-specific logic, which is covered in capabilities spec documents.

## Authority
- Authority: Bible V2, Platform Constitution
- Authority: Bible Synthesis, ADOPTED
- Authority: Spec PLA-TEN-001→006

## Prerequisites
- Clean repository structure established
- Base architecture documentation read and parsed

## Specification Requirements
- WHAT MUST EXIST: An enforced, continuous cycle of context loading, task identification, strict requirement tracing, implementation, and conformance checking. (Authority: Bible V2)

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: Claude acts as an autonomous operator executing deterministic loops: READ SPEC → IDENTIFY REQUIREMENTS → CHECK DEPENDENCIES → IMPLEMENT → TEST → CONFORMANCE AUDIT → CHECK FOR ARCHITECTURAL DRIFT → TRACE TO SPEC → COMMIT. 
- The fundamental constraint: Legacy code (veda-legacy-final tag) is for forensics only, never architecture. (Authority: EXISTING INFRASTRUCTURE / Bible Synthesis)

## Implementation Contract
- **Mission Statement**: Implement Verity from the Master Platform Specification, governed by the Bible, guided by this handoff corpus.
- **First-Session Bootstrap**: Read the 00-build-charter first. Verify the repository is clean. Do not load legacy code models.
- **Per-Session Startup**: Load the Context Loading Order (context-loading-order.md). Verify current build state. Identify next task from task tracker or build order.
- **Per-Task Execution**: Follow `task-execution-protocol.md`. Validate dependency constraints. Implement with domain runtime patterns. Test.
- **End-of-Session**: Run the Self-Review Checklist. Write state to the Implementation Journal. Leave clear next steps.

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation must be applied to all DB queries.
- INV-002: Read-Only Closed States must be enforced via Zod schemas and DB triggers.
- NEVER load VEDA legacy files as architectural references.

## Dependencies
- Depends on: `context-loading-order.md`, `task-execution-protocol.md`, `session-continuity.md`

## Failure Modes
- If Claude loses context, rollback to the last Implementation Journal entry and restart context loading.
- If an unknown pattern is encountered, stop and escalate (see `escalation-triggers.md`).

## Testing Requirements
- Code must pass `tsc --noEmit`, ESLint, and Vitest suite prior to commit.

## Conformance Checks
- All code must pass the forbidden patterns scan.
- No legacy terminology (e.g., `factoryId`, `Department`) can be used.

## Traceability
- PLA-TEN-001, EXE-AUD-001

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Format of the Implementation Journal (Markdown vs. JSON).
