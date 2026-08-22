# Session Continuity

## Purpose
Defines how to hand off state, context, and progress between Claude sessions to prevent memory loss, duplicate work, or context drift.

## Scope
In scope: Session start protocols, session end protocols, Implementation Journal formatting.
Out of scope: Persistent database state.

## Authority
- Authority: Bible V2, Platform Constitution

## Prerequisites
- A directory for storing the Implementation Journal (e.g., `implementation/journal/`).

## Specification Requirements
- WHAT MUST EXIST: A serialized record of agent state, decisions, and blockers to enable stateless sessions to resume work seamlessly.

## Approved Architecture
- HOW IT SHOULD BE IMPLEMENTED: A running markdown-based "Implementation Journal" updated at the end of every session, read at the start of every session.

## Implementation Contract
HOW CLAUDE SHOULD EXECUTE:

**SESSION START PROTOCOL:**
1. Read the Implementation Journal for the last session's state.
2. Read the task tracker for current progress.
3. Run the verification loop (`tsc --noEmit`, `vitest run`) to verify the build still compiles and tests pass (verifying environmental integrity).
4. Identify the next task from the build order or the "Next session priorities" left in the journal.
5. Proceed to `context-loading-order.md`.

**SESSION END PROTOCOL:**
1. Update the Implementation Journal with all accomplishments, WIP, and blockers.
2. Update the task tracker.
3. Ensure all changes are committed (or stashed cleanly if WIP).
4. Leave a clear "next task" note for the next session.

**JOURNAL FORMAT (`implementation-journal.md`):**
```markdown
## Session ID: [Date-Time / Unique ID]
**Duration/Tokens**: [Approximate]
**Tasks Completed**: 
- [Task Name] (Requirement IDs: MET-ACT-001)
**Tasks in Progress**:
- [Task Name]
**Decisions Made**:
- [Decision] (Authority: Bible V1)
**Escalations Raised**:
- [Issue link or description]
**Escalations Resolved**:
- [Resolution]
**Next Session Priorities**:
1. [Clear Next Step]
```

## Constraints & Invariants
- A session MUST NOT end without writing to the Implementation Journal.
- A session MUST NOT begin executing tasks without reading the Implementation Journal.

## Dependencies
- Relies on file system access to maintain `implementation-journal.md`.

## Failure Modes
- If the journal is corrupted or missing, Claude must rebuild context by scanning Git history and comparing it against the Spec.

## Testing Requirements
- N/A

## Conformance Checks
- Traceable via continuous documentation of Requirement IDs.

## Traceability
- PRN-002: Progressive Disclosure of Complexity

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Should the journal be split into daily files, or kept as a single append-only log?
