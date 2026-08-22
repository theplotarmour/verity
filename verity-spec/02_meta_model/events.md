# Verity Master Platform Specification

## 02_meta_model/events.md

## Provenance
*   **Primary Sources**: `reference/temporal/concept-inventory.md` / `reference/n8n/concept-inventory.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model Specification - Event)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. Event Primitive Definition

A **Business Event** is an immutable, historical record representing a state change or operational action that occurred on the platform. Events are published on the Event Bus to drive automations, notifications, and integrations.

---

## 2. Event Payload Schema

Every Business Event must carry a standardized envelope containing:

*   `eventId` (UUID): Unique event identifier.
*   `timestamp` (DateTime): UTC timestamp of transaction commit.
*   `tenantId` (UUID): Scoping tenant ID.
*   `actorId` (UUID): User ID who triggered the action.
*   `eventType` (String): Dot-notated event code (e.g. `work_order.assigned`).
*   `entityType` (String): Target entity class (e.g. `WorkOrder`).
*   `entityId` (UUID): Target entity primary key.
*   `payload` (dynamic document extensions): Dynamic data payload mapping previous state, new state, and altered fields.

---

## 3. Core Invariants

### MET-EVE-001: Immutability
*   **Rule**: Business Events are strictly write-once. An event record can never be modified or deleted.
*   **Status**: `[FACT]`

### MET-EVE-002: Commit Sequence Order
*   **Rule**: The publishing of an event to the outbound Event Bus must occur within the same database transaction lifecycle as the action mutation, using the Outbox pattern. The event is written to a database `Outbox` table and picked up by a background publisher, ensuring events are never dispatched if the transaction rolls back.
*   **Status**: `[FACT]`
