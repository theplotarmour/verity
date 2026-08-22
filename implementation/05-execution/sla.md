# Service Level Agreements (sla.md)

## Purpose
This document defines the SLA timer implementation and clock state machine for Verity.

## Scope
**In Scope:**
- SLA clock state machine
- Hierarchical SLA resolution (Contract > Tenant > Explicit)
- Breach calculation based on event history

**Out of Scope:**
- External timer services

## Authority
- **Bible V3 (Execution Engine):** SLA Clock State Machine, SLA override hierarchy, event history parsing for timers.

## Prerequisites
- Work Order lifecycle events must be recorded.
- Contracts module (if implemented) or Tenant settings must exist.

## Specification Requirements
- **WHAT MUST EXIST:** SLA calculation that determines if a Work Order is on time, overdue, or breached.

## Approved Architecture
- **Stateless Calculation (Authority: Bible V3):** SLA timers read event history directly rather than using a separate active timer service.

## Implementation Contract
Claude Code shall implement SLA logic as follows:
1. **Resolution Hierarchy:** When computing SLA for a Work, resolve the deadline by checking:
   1. Explicit Work deadline field.
   2. Contract SLA terms (if linked).
   3. Default Tenant SLA.
2. **Clock State Machine:** Implement a domain service that reads the event log of a `WorkOrder` and calculates the total active time based on:
   - `Initialize` → `Start (Running)` ↔ `Pause/Resume` → `Stop (Completed)` or `Breach (Overdue)`.
3. Compute whether the total running time exceeds the resolved SLA duration.
4. Expose this via a computed field or query function for the UI/dispatch board, so breach notifications can be generated dynamically.

## Constraints & Invariants
- The SLA calculation must be deterministic based strictly on the immutable event/audit log of the entity.

## Dependencies
- **Depends on:** Work Order, Audit/Event Log.

## Failure Modes
- **Missing Events:** Handled by validating state transitions in Work Order. If an event is missing, the system falls back to entity `updatedAt` timestamps safely.

## Testing Requirements
- Unit tests for the SLA resolution hierarchy.
- Unit tests computing total active duration with simulated pause/resume event logs.

## Conformance Checks
- Ensure no background daemon is polling continuously to update a "current SLA duration" column; it must be calculated.

## Traceability
- Bible V3

## Open Decisions
- **IMPLEMENTATION DECISION REQUIRED:** Exact business hours model (e.g., whether to use a specific library or calendar definition for skipping weekends/holidays in SLA calculation).
