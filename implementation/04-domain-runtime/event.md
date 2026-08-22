# Purpose
Defines the event system for asynchronous communication and audit trails in Verity.

# Scope
Covers event structure, transactional outbox pattern, event immutability, and naming conventions.

# Authority
- Spec MET-EVE-001: Event Immutability
- Spec MET-EVE-002: Commit Sequence Order
- Spec GOV-TER-015: Event definition
- Spec GOV-TER-016: Log vs Event definition
- Approved Architecture: Outbox Pattern

# Prerequisites
- PostgreSQL & Prisma
- Command Pipeline

# Specification Requirements
- MET-EVE-001: Immutability (write-once, never modified or deleted).
- MET-EVE-002: Commit Sequence Order (publish within same DB transaction via Outbox).
- GOV-TER-015: Event is an immutable chronological record emitted to the Event Bus.
- GOV-TER-016: Log is separate from Event — never mix developer logs with business events.

# Approved Architecture
- **Transactional Outbox**: Prisma transaction writes to Outbox table (Authority: Architecture Consensus).
- **Background Dispatch**: Processor reads outbox and dispatches (IMPLEMENTATION DECISION REQUIRED for underlying message broker, though Inngest is installed).

# Implementation Contract
- **Outbox Pattern**: Within `mutate`, the Command writes the domain event to a `DomainEventOutbox` table.
- **Structure**:
  - `eventId` (UUID)
  - `eventType` (String, e.g., `capability.entity.action`)
  - `aggregateId` (UUID)
  - `aggregateType` (String)
  - `tenantId` (UUID)
  - `payload` (JSONB)
  - `timestamp` (DateTime UTC)
  - `actorId` (UUID)
- **Naming**: `{capability}.{entity}.{action}` (e.g., `work.work_order.created`, `work.work_order.transitioned`).
- **Subscriber Registration**: Capabilities register handlers for specific `eventType`s.

# Constraints & Invariants
- Events MUST NEVER be updated or deleted (MET-EVE-001).
- Events MUST NOT contain developer logs (GOV-TER-016).

# Dependencies
- Depends on: Prisma transactions.

# Failure Modes
- Outbox processor crashes; restarts and guarantees at-least-once delivery.

# Testing Requirements
- Verify Outbox entry is created alongside mutation.
- Verify rollback prevents Outbox entry.

# Conformance Checks
- DB triggers enforcing `prevent update/delete` on Outbox table.

# Traceability
- MET-EVE-001, MET-EVE-002, GOV-TER-015, GOV-TER-016

# Open Decisions
- **IMPLEMENTATION DECISION REQUIRED**: Wiring up Inngest or using a custom poller for Outbox processing.
