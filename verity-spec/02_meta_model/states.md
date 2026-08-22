# Verity Master Platform Specification

## 02_meta_model/states.md

## Provenance
*   **Primary Sources**: `reference/plane/concept-inventory.md` / `reference/plane/verity-implications.md`
*   **Verity Bible Authority**: [verity-bible/volume_2_metamodel_primitives.md](file:///D:/Code/verity/verity-bible/volume_2_metamodel_primitives.md) (Section 1: Meta-Model Specification - State)
*   **Transformation Type**: ADAPT
*   **Open Decisions**: None

---

## 1. State Primitive Definition

A **State** is a static status representation of an Entity. An Entity must always exist in exactly one valid State defined by its capability's lifecycle.

---

## 2. Decoupled State Categories vs. Status Labels

To allow tenants to configure highly localized workflows while enabling the core engine to calculate SLA deadlines and progress consistently, Verity decouples core system State Categories from custom Status Labels.

### MET-STA-001: System State Categories
*   **Description**: Fixed, platform-level enums that dictate core engine behavior.
*   *Examples for Work*: `DRAFT`, `SCHEDULING`, `EN_ROUTE`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
*   **Status**: `[FACT]`
*   **Traceability**: Mapped from Plane state category concept.

### MET-STA-002: Tenant Custom Status Labels
*   **Description**: User-friendly, configurable strings mapped to a single system category.
*   *Example mapping*: A custom status "Awaiting Gate Pass" maps to the `SCHEDULING` system state category; "Replacing Compressor" maps to the `IN_PROGRESS` system state category.
*   **Status**: `[FACT]`

---

## 3. Configuration and Mapping

### MET-STA-003: Mandatory Category Binding
*   **Rule**: When a tenant creates a custom Status, they must map it to exactly one valid system `StateCategory`.
*   **Status**: `[FACT]`

### MET-STA-004: SLA Timer Triggers
*   **Rule**: SLA timers and clock states (Running, Paused, Stopped) evaluate changes strictly at the system `StateCategory` layer, ignoring the custom Status Label text.
*   **Status**: `[FACT]`
