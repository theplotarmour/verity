# Workflow Engine

## Purpose
Defines the execution model for automated workflows across the platform.

## Scope
- Workflow definition format
- Trigger and Action nodes
- Tenant-scoped execution
- DAG traversal logic

## Authority
- Bible Synthesis ADOPTED: n8n DAG automation (trigger/action DAG nodes, JSON envelope payloads)
- Bible Synthesis ADOPTED: Temporal patterns
- Bible V5: Tenancy

## Prerequisites
- Event Bus (for trigger events)
- PostgreSQL/Prisma (for workflow storage)

## Specification Requirements
- Workflows must be tenant-scoped (PLA-TEN-001)

## Approved Architecture
- **DAG Automation Model**: Workflows are modeled as Directed Acyclic Graphs (DAGs) of nodes with JSON envelope payloads (Authority: Bible Synthesis ADOPTED from n8n).
- **Triggers**: Event-driven (react to domain events from event bus), scheduled (cron), or manual.
- **Actions**: Command execution, notifications, external API calls, data transformation.
- **Declarative Definition**: Workflow definitions are declarative JSON/config objects, not hardcoded logic.
- **Execution**: Ordered node traversal, conditional branching, standard error handling routes.

## Implementation Contract
1. Create a `Workflow` Prisma model tied to `Tenant`.
2. Define a standard JSON schema (using Zod) for the DAG definition.
3. Implement a WorkflowExecutor service that parses the DAG, resolves dependencies, and executes nodes sequentially or concurrently based on the graph.
4. Payload passing: Each node receives the output JSON envelope of its parent nodes.

## Constraints & Invariants
- INV-001: Strict Tenancy Isolation. Workflows can only access data and trigger actions within their owning tenant.
- No undeclared direct dependency between capabilities.

## Dependencies
- Database Schema
- Event Bus

## Failure Modes
- Malformed DAG (cyclic dependencies) - Reject on save.
- Node execution failure - Halt workflow or trigger error path.

## Testing Requirements
- Unit test DAG resolution logic.
- Integration test end-to-end workflow execution.

## Conformance Checks
- Verify tenant boundary enforcement during node execution.

## Traceability
- PLA-TEN-001

## Open Decisions
- IMPLEMENTATION DECISION REQUIRED: Specific schema for the DAG JSON.
