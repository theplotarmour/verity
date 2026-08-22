# Automation Engine

## Purpose
Defines event-driven automation rules.

## Scope
- Rule evaluation
- Event-triggered actions
- Priority and ordering

## Authority
- Spec MET-EVE-001: Event immutability

## Prerequisites
- Event Processing
- Workflow Engine

## Specification Requirements
- React to immutable domain events (MET-EVE-001)

## Approved Architecture
- **Rule Format**: `WHEN [event] IF [condition] THEN [action]`
- **Triggers**: Driven by domain events from the event bus.
- **Execution Context**: Executed strictly within the tenant context.
- **Ordering**: Rules have defined priorities to resolve execution order when multiple rules match the same event.

## Implementation Contract
1. Define an `AutomationRule` model.
2. Implement a rule evaluator that subscribes to the event bus.
3. Upon event reception, evaluate `IF` conditions for matching rules in priority order.
4. Enqueue `THEN` actions as background jobs or workflow triggers.

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation.
- PRN-001: Least Surprise / Explainable Automation.

## Dependencies
- Event Bus

## Failure Modes
- Condition evaluation failure - Log and skip rule.
- Action execution failure - Handled by Retry Strategy.

## Testing Requirements
- Test rule matching logic.
- Test priority ordering.

## Conformance Checks
- Verify rules only trigger for tenant-specific events.

## Traceability
- MET-EVE-001

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: DSL or format for the `IF` condition evaluation.
