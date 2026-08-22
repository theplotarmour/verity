# Approvals (approval.md)

## Purpose
This document defines the formal permission gates and approval chains within Verity, allowing actions to be gated by supervisor or client sign-off.

## Scope
**In Scope:**
- Sequential and parallel approval steps
- Approval delegation
- Command integration

**Out of Scope:**
- Generic workflow builder (see n8n pattern in workflow execution, if applicable)

## Authority
- **Spec MET-ACT-001→004:** Command pipeline constraints.
- **User Matrix:** Approval uses command validation for conflict policy.

## Prerequisites
- Command Pipeline must exist.

## Specification Requirements
- **WHAT MUST EXIST:** A formal gate that blocks a command or transition until authorized users provide consent.

## Approved Architecture
- **Conflict Policy (Authority: User Matrix):** Command validation (reject if state changed).
- **Data Model (Authority: Bible V1):** PostgreSQL.

## Implementation Contract
Claude Code shall implement approvals as follows:
1. Define Prisma model `ApprovalRequest` linked to a specific Command payload or `WorkOrder`.
2. Track `status` (PENDING, APPROVED, REJECTED), `delegatedTo` (Party ID), and `requiredRole`.
3. Support chains: Approval steps can have a `sequenceIndex`. Only when step N is APPROVED does step N+1 become actionable.
4. When a gated command is submitted, it does not immediately execute. It generates an `ApprovalRequest`. Upon full approval, the original command payload is executed.
5. In the case of conflict (e.g., target entity was modified while pending), command validation rejects the execution of the approved command.

## Constraints & Invariants
- Approvals must integrate natively with the MET-ACT command pipeline; they are delayed command executions.

## Dependencies
- **Depends on:** Command Pipeline, Party (for identity).
- **Depended on by:** Work (Pending-Verification state).

## Failure Modes
- **Stale Approval:** An approval is granted, but the underlying entity has changed. Command validation fails and the approval is voided.

## Testing Requirements
- Unit test sequence progression (sequential approvals).
- Integration test simulating stale approval rejection.

## Conformance Checks
- Ensure no state mutation occurs when an approval is requested, only when fully granted.

## Traceability
- MET-ACT-001→004

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** Timeout handling: what happens when approval is not granted within deadline (auto-reject, escalate, or wait indefinitely?).
