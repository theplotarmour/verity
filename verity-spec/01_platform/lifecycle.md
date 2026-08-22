# Verity Master Platform Specification

## 01_platform/lifecycle.md

## Provenance
*   **Primary Sources**: None
*   **Verity Bible Authority**: [verity-bible/_synthesis/verity-canonical-update.md](file:///D:/Code/verity/verity-bible/_synthesis/verity-canonical-update.md)
*   **Transformation Type**: ADOPT
*   **Open Decisions**: None

---

## 1. The Definition of Done (DoD) for a Capability

A new business capability (e.g. `Asset Tracking`, `Timesheets`) is only considered complete and eligible for registration in the platform's core catalog when it meets all 25 criteria in this contract.

---

## 2. Capability Completion Criteria

### PLA-LIF-001: Schema & Data Model
*   `[ ]` **Identity**: Unique name registered in the platform capabilities catalog.
*   `[ ]` **Entities**: All business entities defined with unique database tables scoped by `tenant_id`.
*   `[ ]` **Fields**: All attributes declared with explicit data types, default values, and validation parameters.
*   `[ ]` **Relationships**: Semantic foreign key links configured with delete cascades (restrict | cascade | set_null).
*   *Status*: `[FACT]`

### PLA-LIF-002: Process & State Machines
*   `[ ]` **States**: Fixed status enumerations mapping to core state categories.
*   `[ ]` **Actions**: Mutating transactions defining inputs and emitting business events.
*   `[ ]` **Transitions**: Explicit validation matrices defining allowed state movements.
*   `[ ]` **Workflows**: Multi-stage orchestration chains mapped using DAG execution engines.
*   `[ ]` **Business Rules**: Deterministic code checks enforcing invariants.
*   *Status*: `[FACT]`

### PLA-LIF-003: Access Control & Auditing
*   `[ ]` **Permissions**: Declarative role mappings defining who can execute actions.
*   `[ ]` **Audit Trails**: Every state change recorded to the immutable event log.
*   *Status*: `[FACT]`

### PLA-LIF-004: Communication & Triggers
*   `[ ]` **Events Emitted**: Outbound hooks registered on the Event Bus.
*   `[ ]` **Events Consumed**: Handlers registered for reacting to platform-wide events.
*   `[ ]` **Notifications**: Abstract messaging triggers linked to template layouts.
*   *Status*: `[FACT]`

### PLA-LIF-005: User Experience
*   `[ ]` **Forms**: Configurable metadata JSON schemas for edit/create pages.
*   `[ ]` **Search Indexes**: Match/term search filters and sorting rules defined.
*   `[ ]` **Reports**: Fixed analytical dashboards and aggregations.
*   `[ ]` **Mobile Layouts**: Simplified checklist and action screens for deskless workers.
*   *Status*: `[FACT]`

### PLA-LIF-006: Resilience & Environment
*   `[ ]` **Offline Behavior**: Conflict policy classes (`SERVER_AUTHORITATIVE` etc.) mapped to all write actions.
*   `[ ]` **Failure Behavior**: Graceful fallbacks and exception routing defined.
*   `[ ]` **API Endpoints**: REST/GraphQL contract definitions with payload structures.
*   `[ ]` **Migrations**: DB schema upgrade and data transition scripts.
*   `[ ]` **Dependencies**: Explicit list of required external capabilities.
*   `[ ]` **Test Coverage**: Unit, permission, integration, and offline sync test suites.
*   *Status*: `[FACT]`
